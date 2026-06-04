import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TelegramService } from "./telegram.service";
import * as schema from "@adms/database";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";
import { and, between, eq, gte, lt, sql, desc, isNull, inArray } from "drizzle-orm";

@Injectable()
export class TelegramCronService {
	private readonly logger = new Logger(TelegramCronService.name);

	constructor(
		private readonly telegramService: TelegramService,
		@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
	) {}

	// 5. Daily Auto-Report (Akhir Hari pkl 17:30)
	@Cron("30 17 * * *")
	async sendDailyReport() {
		this.logger.log("Running Daily Auto-Report Cron");
		try {
			// Trigger the /dashboard text generation from telegramService
			// Since getDashboardText is private, we will recreate a simple summary
			const now = new Date();
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const end = new Date(start.getTime() + 86400000 - 1);

			const [employees] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.employees).where(eq(schema.employees.isActive, true));
			const totalEmp = Number(employees.count);

			const todayLogs = await this.db
				.select({ employeeId: schema.attendanceLogs.employeeId, status: schema.attendanceLogs.status })
				.from(schema.attendanceLogs)
				.where(and(eq(schema.attendanceLogs.type, "IN"), between(schema.attendanceLogs.timestamp, start, end)));

			const present = new Set(todayLogs.map(l => l.employeeId)).size;
			const late = todayLogs.filter(l => l.status === "LATE").length;

			const message = `<b>📋 [AUTO-REPORT] Rekapitulasi Akhir Hari</b>
━━━━━━━━━━━━━━━━━━━━━
👥 Total Pegawai Aktif: <b>${totalEmp}</b>
✅ Hadir: <b>${present}</b>
⚠️ Terlambat: <b>${late}</b>
❌ Tidak Hadir (Alpa/Cuti): <b>${totalEmp - present}</b>

<i>Laporan ini di-generate otomatis oleh sistem setiap pkl 17:30.</i>`;
			
			await this.telegramService.sendNotification(message);
		} catch (error) {
			this.logger.error("Failed to run Daily Report Cron", error);
		}
	}

	// 12. Deteksi Lupa Absen Pulang (Missing Clock-Out at 22:00)
	@Cron("0 22 * * *")
	async checkMissingClockOut() {
		this.logger.log("Running Missing Clock-Out Cron");
		try {
			const now = new Date();
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const end = new Date(start.getTime() + 86400000 - 1);

			const logs = await this.db
				.select({
					employeeId: schema.attendanceLogs.employeeId,
					type: schema.attendanceLogs.type,
					name: schema.employees.name,
				})
				.from(schema.attendanceLogs)
				.innerJoin(schema.employees, eq(schema.attendanceLogs.employeeId, schema.employees.id))
				.where(between(schema.attendanceLogs.timestamp, start, end));

			const inLogs = new Map<number, string>();
			const outLogs = new Set<number>();

			logs.forEach((log) => {
				if (log.type === "IN") inLogs.set(log.employeeId, log.name);
				if (log.type === "OUT") outLogs.add(log.employeeId);
			});

			const missing: string[] = [];
			for (const [id, name] of inLogs.entries()) {
				if (!outLogs.has(id)) {
					missing.push(name);
				}
			}

			if (missing.length > 0) {
				const list = missing.map(m => `• ${m}`).join("\n");
				const message = `<b>⚠️ Peringatan: Lupa Absen Keluar</b>
━━━━━━━━━━━━━━━━━━━━━
Terdapat ${missing.length} Karyawan yang absen masuk hari ini tapi TIDAK absen keluar hingga pukul 22:00:

${list}

<i>Status absensi mereka otomatis menggantung di sistem.</i>`;
				await this.telegramService.sendNotification(message);
			}
		} catch (error) {
			this.logger.error("Failed to run Missing Clock-Out Cron", error);
		}
	}

	// 11. Ghost/Anomaly Check-in (Run every hour between 00:00 - 04:00)
	@Cron("0 0,1,2,3,4 * * *")
	async checkAnomalousCheckin() {
		this.logger.log("Running Anomaly Check Cron");
		try {
			const now = new Date();
			const start = new Date(now.getTime() - 60 * 60 * 1000); // last 1 hour
			
			const logs = await this.db
				.select({
					name: schema.employees.name,
					timestamp: schema.attendanceLogs.timestamp,
				})
				.from(schema.attendanceLogs)
				.innerJoin(schema.employees, eq(schema.attendanceLogs.employeeId, schema.employees.id))
				.where(between(schema.attendanceLogs.timestamp, start, now));

			if (logs.length > 0) {
				const list = logs.map(l => `• ${l.name} (${l.timestamp.toLocaleTimeString("id-ID")})`).join("\n");
				const message = `<b>🚨 PERINGATAN ANOMALI KEAMANAN</b>
━━━━━━━━━━━━━━━━━━━━━
Terdeteksi aktivitas absen di jam tidak wajar (Tengah Malam/Dini Hari):

${list}

<i>Mohon periksa rekaman CCTV atau validasi kehadiran ini.</i>`;
				await this.telegramService.sendNotification(message);
			}
		} catch (error) {
			this.logger.error("Failed to run Anomaly Check Cron", error);
		}
	}

	// 13. Peringatan Mangkir Berturut-turut (AWOL Alert - Run daily at 10:00 AM)
	@Cron("0 10 * * *")
	async checkAWOL() {
		this.logger.log("Running AWOL Check Cron");
		// Simplified AWOL check: Find employees who are active but haven't clocked in for the last 3 days
		// A full robust implementation would check shifts, weekends, and leaves. 
		// For now, this is a placeholder/simplified logic for demonstration.
		const message = `<b>🔴 PERINGATAN MANGKIR (AWOL)</b>
━━━━━━━━━━━━━━━━━━━━━
Sistem sedang memonitor kehadiran. Fitur pemindaian mangkir 3 hari berturut-turut aktif dan akan melapor jika menemukan pegawai yang alpa tanpa keterangan (Dalam pengembangan AI lanjut).`;
		// In a real scenario we wouldn't send a placeholder, but calculating 3 consecutive days strictly requires heavy calendar join.
		// await this.telegramService.sendNotification(message); 
	}

	// 3. Smart Reminders (Shift Reminder 15 minutes before)
	// Run every 15 minutes to check
	@Cron("*/15 * * * *")
	async checkShiftReminders() {
		this.logger.log("Running Shift Reminders Cron");
		// Placeholder for advanced shift joining logic.
		// A full implementation would select shift details and find users missing IN log for today
	}

	// 6. Device Downtime Alert (Run every 10 minutes)
	@Cron("*/10 * * * *")
	async checkDeviceDowntime() {
		this.logger.log("Running Device Downtime Cron");
		try {
			const now = new Date();
			const devices = await this.db.select().from(schema.devices);
			
			const offlineList: string[] = [];
			for (const dev of devices) {
				// Consider device offline if lastSeen is older than 10 minutes or isOnline is false
				const isOffline = dev.lastSeen ? (now.getTime() - dev.lastSeen.getTime() > 10 * 60 * 1000) : !dev.isOnline;
				
				if (isOffline) {
					offlineList.push(dev.name);
				}
			}

			if (offlineList.length > 0) {
				const list = offlineList.map(m => `• ${m}`).join("\n");
				const message = `<b>🔴 PERINGATAN KONEKSI MESIN</b>
━━━━━━━━━━━━━━━━━━━━━
Mesin absensi berikut terputus dari jaringan (OFFLINE):

${list}

<i>Mohon segera periksa koneksi LAN/WiFi pada mesin tersebut.</i>`;
				await this.telegramService.sendNotification(message);
			}
		} catch (error) {
			this.logger.error("Failed to run Device Downtime Cron", error);
		}
	}

	// 10. Device Capacity Warning (Run daily at 12:00)
	@Cron("0 12 * * *")
	async checkDeviceCapacity() {
		this.logger.log("Running Device Capacity Cron");
		try {
			// Mock capacity check by counting total logs in database
			// A real system would read the actual device capacity parameter
			const [totalLogs] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.attendanceLogs);
			const count = Number(totalLogs.count);
			
			// Assume 50000 is the limit for typical small ZKTeco devices
			if (count > 45000) {
				const percentage = Math.round((count / 50000) * 100);
				const message = `<b>⚠️ PERINGATAN MEMORI MESIN Penuh</b>
━━━━━━━━━━━━━━━━━━━━━
Kapasitas log absensi telah mencapai <b>${percentage}%</b> (${count}/50.000 log).

<i>Segera bersihkan log pada mesin untuk mencegah error "Memory Full" saat Karyawan absen.</i>`;
				await this.telegramService.sendNotification(message);
			}
		} catch (error) {
			this.logger.error("Failed to run Device Capacity Cron", error);
		}
	}
}
