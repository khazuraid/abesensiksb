import type { db as database } from "@adms/database";
import * as schema from "@adms/database";
import { CronJob } from "cron";
import { and, between, eq, inArray, lt, sql } from "drizzle-orm";
import type { TelegramBot } from "./telegram.js";

type Db = typeof database;
type Logger = Pick<Console, "error" | "info">;

export const workerCronSchedules = {
	dailyReport: "30 17 * * *",
	missingClockOut: "0 22 * * *",
	anomalousCheckin: "0 0,1,2,3,4 * * *",
	deviceDowntime: "*/10 * * * *",
	deviceCapacity: "0 12 * * *",
} as const;

function todayRange(now = new Date()) {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return { start, end: new Date(start.getTime() + 86_400_000 - 1) };
}

export class WorkerCron {
	private jobs: CronJob[] = [];
	private running = new Set<() => Promise<void>>();

	constructor(
		private db: Db,
		private telegram: TelegramBot,
		private logger: Logger = console,
	) {}

	start() {
		const tasks: [string, () => Promise<void>][] = [
			[workerCronSchedules.dailyReport, () => this.dailyReport()],
			[workerCronSchedules.missingClockOut, () => this.missingClockOut()],
			[workerCronSchedules.anomalousCheckin, () => this.anomalousCheckin()],
			[workerCronSchedules.deviceDowntime, () => this.deviceDowntime()],
			[workerCronSchedules.deviceCapacity, () => this.deviceCapacity()],
		];
		this.jobs = tasks.map(([cronTime, task]) =>
			CronJob.from({
				cronTime,
				timeZone: "Asia/Jakarta",
				start: true,
				onTick: () => void this.run(task),
			}),
		);
		void this.catchUp();
	}

	private async catchUp() {
		await this.run(() => this.dailyReport());
		await this.run(() => this.missingClockOut());
		await this.run(() => this.deviceCapacity());
	}

	stop() {
		for (const job of this.jobs) job.stop();
	}

	private async run(task: () => Promise<void>) {
		if (this.running.has(task)) return;
		this.running.add(task);
		try {
			await this.telegram.refreshSettings();
			await task();
		} catch (error) {
			this.logger.error(`Worker cron failed: ${(error as Error).message}`);
		} finally {
			this.running.delete(task);
		}
	}

	private async once(
		jobName: string,
		periodKey: string,
		task: () => Promise<void>,
	) {
		const now = new Date();
		const [claimed] = await this.db
			.insert(schema.workerCronRuns)
			.values({ jobName, periodKey, status: "RUNNING", startedAt: now })
			.onConflictDoUpdate({
				target: [
					schema.workerCronRuns.jobName,
					schema.workerCronRuns.periodKey,
				],
				set: { status: "RUNNING", startedAt: now, completedAt: null },
				setWhere: and(
					eq(schema.workerCronRuns.status, "RUNNING"),
					lt(
						schema.workerCronRuns.startedAt,
						new Date(now.getTime() - 30 * 60_000),
					),
				),
			})
			.returning({ jobName: schema.workerCronRuns.jobName });
		if (!claimed) return;
		try {
			await task();
			await this.db
				.update(schema.workerCronRuns)
				.set({ status: "COMPLETED", completedAt: new Date() })
				.where(
					and(
						eq(schema.workerCronRuns.jobName, jobName),
						eq(schema.workerCronRuns.periodKey, periodKey),
					),
				);
		} catch (error) {
			await this.db
				.delete(schema.workerCronRuns)
				.where(
					and(
						eq(schema.workerCronRuns.jobName, jobName),
						eq(schema.workerCronRuns.periodKey, periodKey),
					),
				);
			throw error;
		}
	}

	private periodKey(includeHour = false) {
		const now = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Jakarta",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			hourCycle: "h23",
		}).formatToParts(new Date());
		const part = (type: Intl.DateTimeFormatPartTypes) =>
			now.find((value) => value.type === type)?.value ?? "";
		const date = `${part("year")}-${part("month")}-${part("day")}`;
		return includeHour ? `${date}:${part("hour")}` : date;
	}

	private async dailyReport() {
		return this.once("daily-report", this.periodKey(), () =>
			this.doDailyReport(),
		);
	}

	private async doDailyReport() {
		const { start, end } = todayRange();
		const [employees] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));
		const logs = await this.db
			.select({
				employeeId: schema.attendanceLogs.employeeId,
				status: schema.attendanceLogs.status,
			})
			.from(schema.attendanceLogs)
			.where(
				and(
					eq(schema.attendanceLogs.type, "IN"),
					between(schema.attendanceLogs.timestamp, start, end),
				),
			);
		const total = Number(employees?.count ?? 0);
		const present = new Set(logs.map((log) => log.employeeId)).size;
		const late = logs.filter((log) => log.status === "LATE").length;
		await this.telegram.sendNotification(
			`<b>📋 [AUTO-REPORT] Rekapitulasi Akhir Hari</b>\n━━━━━━━━━━━━━━━━━━━━━\n👥 Total Pegawai Aktif: <b>${total}</b>\n✅ Hadir: <b>${present}</b>\n⚠️ Terlambat: <b>${late}</b>\n❌ Tidak Hadir: <b>${Math.max(0, total - present)}</b>`,
		);
	}

	private async missingClockOut() {
		return this.once("missing-clock-out", this.periodKey(), () =>
			this.doMissingClockOut(),
		);
	}

	private async doMissingClockOut() {
		const { start, end } = todayRange();
		const logs = await this.db
			.select({
				employeeId: schema.attendanceLogs.employeeId,
				type: schema.attendanceLogs.type,
				name: schema.employees.name,
			})
			.from(schema.attendanceLogs)
			.innerJoin(
				schema.employees,
				eq(schema.attendanceLogs.employeeId, schema.employees.id),
			)
			.where(between(schema.attendanceLogs.timestamp, start, end));
		const checkedIn = new Map<number, string>();
		const checkedOut = new Set<number>();
		for (const log of logs) {
			if (log.type === "IN") checkedIn.set(log.employeeId, log.name);
			if (log.type === "OUT") checkedOut.add(log.employeeId);
		}
		const missing = [...checkedIn]
			.filter(([id]) => !checkedOut.has(id))
			.map(([, name]) => `• ${name}`);
		if (missing.length) {
			await this.telegram.sendNotification(
				`<b>⚠️ Peringatan: Lupa Absen Keluar</b>\n${missing.join("\n")}`,
			);
		}
	}

	private async anomalousCheckin() {
		return this.once("anomalous-checkin", this.periodKey(true), () =>
			this.doAnomalousCheckin(),
		);
	}

	private async doAnomalousCheckin() {
		const end = new Date();
		const start = new Date(end.getTime() - 3_600_000);
		const logs = await this.db
			.select({
				name: schema.employees.name,
				timestamp: schema.attendanceLogs.timestamp,
			})
			.from(schema.attendanceLogs)
			.innerJoin(
				schema.employees,
				eq(schema.attendanceLogs.employeeId, schema.employees.id),
			)
			.where(between(schema.attendanceLogs.timestamp, start, end));
		if (logs.length) {
			await this.telegram.sendNotification(
				`<b>🚨 PERINGATAN ANOMALI KEAMANAN</b>\n${logs
					.map(
						(log) =>
							`• ${log.name} (${log.timestamp.toLocaleTimeString("id-ID")})`,
					)
					.join("\n")}`,
			);
		}
	}

	private async deviceDowntime() {
		const now = Date.now();
		const devices = await this.db.select().from(schema.devices);
		const stale = devices.filter(
			(device) => !device.lastSeen || now - device.lastSeen.getTime() > 600_000,
		);
		const newlyOffline = stale.filter((device) => device.isOnline);
		if (stale.length)
			await this.db
				.update(schema.devices)
				.set({ isOnline: false, updatedAt: new Date() })
				.where(
					inArray(
						schema.devices.id,
						stale.map((device) => device.id),
					),
				);
		const offline = newlyOffline.map((device) => `• ${device.name}`);
		if (offline.length) {
			await this.telegram.sendNotification(
				`<b>🔴 PERINGATAN KONEKSI MESIN</b>\n${offline.join("\n")}`,
			);
		}
	}

	private async deviceCapacity() {
		return this.once("device-capacity", this.periodKey(), () =>
			this.doDeviceCapacity(),
		);
	}

	private async doDeviceCapacity() {
		const [total] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.attendanceLogs);
		const count = Number(total?.count ?? 0);
		if (count > 45_000) {
			await this.telegram.sendNotification(
				`<b>⚠️ PERINGATAN MEMORI MESIN</b>\nLog telah mencapai ${count}/50.000.`,
			);
		}
	}
}
