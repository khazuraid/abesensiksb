import * as schema from "@adms/database";
import { Inject, Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, between, eq, gte, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class TelegramService implements OnModuleInit {
	private readonly logger = new Logger(TelegramService.name);
	private readonly enabled: boolean;
	private readonly token: string;
	private readonly chatId: string;
	private offset = 0;
	private polling = false;

	constructor(
		private readonly configService: ConfigService,
		@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
		@Inject("TELEGRAM_ENABLED") @Optional() enabled?: boolean,
	) {
		this.enabled = enabled ?? false;
		this.token = this.configService.get<string>("TELEGRAM_TOKEN") || "";
		this.chatId = this.configService.get<string>("TELEGRAM_CHAT_ID") || "";
		if (!this.enabled) {
			this.logger.warn("Telegram bot disabled (no valid token)");
		}
	}

	async onModuleInit() {
		if (!this.enabled) return;
		await this.registerCommands();
		this.startPolling();
	}

	private async registerCommands() {
		const commands = [
			{ command: "start", description: "Menu utama" },
			{ command: "dashboard", description: "Ringkasan hari ini" },
			{ command: "hadir", description: "Pegawai yang sudah absen" },
			{ command: "belum", description: "Pegawai yang belum absen" },
			{ command: "terlambat", description: "Pegawai terlambat hari ini" },
			{ command: "rekap", description: "Rekap kehadiran bulan ini" },
			{ command: "cari", description: "Cari status pegawai" },
			{ command: "pegawai", description: "Info pegawai aktif" },
			{ command: "perangkat", description: "Status perangkat" },
			{ command: "shift", description: "Info shift aktif" },
			{ command: "libur", description: "Hari libur bulan ini" },
		];
		await this.apiCall("setMyCommands", { commands });
		this.logger.log("Bot commands registered");
	}

	private startPolling() {
		if (this.polling) return;
		this.polling = true;
		this.poll();
	}

	private async poll() {
		while (this.polling) {
			try {
				const data = await this.apiCall("getUpdates", { offset: this.offset, timeout: 30 });
				if (data?.result?.length) {
					for (const update of data.result) {
						this.offset = update.update_id + 1;
						if (update.message?.text) {
							await this.handleMessage(update.message);
						}
					}
				}
			} catch (e) {
				this.logger.error(`Polling error: ${(e as Error).message}`);
				await new Promise((r) => setTimeout(r, 5000));
			}
		}
	}

	private async handleMessage(msg: { chat: { id: number }; text: string }) {
		const chatId = msg.chat.id;
		const [cmd, ...args] = msg.text.split(" ");
		const command = cmd.replace("@Absensiksb_bot", "").toLowerCase();

		switch (command) {
			case "/start": return this.cmdStart(chatId);
			case "/dashboard": return this.cmdDashboard(chatId);
			case "/hadir": return this.cmdHadir(chatId);
			case "/belum": return this.cmdBelum(chatId);
			case "/terlambat": return this.cmdTerlambat(chatId);
			case "/rekap": return this.cmdRekap(chatId);
			case "/cari": return this.cmdCari(chatId, args.join(" "));
			case "/pegawai": return this.cmdPegawai(chatId);
			case "/perangkat": return this.cmdPerangkat(chatId);
			case "/shift": return this.cmdShift(chatId);
			case "/libur": return this.cmdLibur(chatId);
		}
	}

	private todayRange() {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const end = new Date(start.getTime() + 86400000 - 1);
		return { start, end };
	}

	private async cmdStart(chatId: number) {
		await this.send(chatId, `<b>🏢 ADMS Attendance Bot</b>
━━━━━━━━━━━━━━━━━━
Perintah tersedia:

/dashboard - Ringkasan hari ini
/hadir - Sudah absen hari ini
/belum - Belum absen hari ini
/terlambat - Terlambat hari ini
/rekap - Rekap bulan ini
/cari [nama] - Cari pegawai
/pegawai - Info pegawai
/perangkat - Status mesin
/shift - Info shift
/libur - Hari libur`);
	}

	private async cmdDashboard(chatId: number) {
		const { start, end } = this.todayRange();
		const [employees] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.employees).where(eq(schema.employees.isActive, true));
		const totalEmp = Number(employees.count);

		const todayLogs = await this.db.select({ employeeId: schema.attendanceLogs.employeeId, status: schema.attendanceLogs.status })
			.from(schema.attendanceLogs)
			.where(and(eq(schema.attendanceLogs.type, "IN"), between(schema.attendanceLogs.timestamp, start, end)));

		const present = new Set(todayLogs.map((l) => l.employeeId)).size;
		const late = todayLogs.filter((l) => l.status === "LATE").length;

		const [devicesOnline] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.devices).where(eq(schema.devices.isOnline, true));
		const [devicesTotal] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.devices);

		await this.send(chatId, `<b>📊 Dashboard Hari Ini</b>
━━━━━━━━━━━━━━━━━━
👥 Total Pegawai: <b>${totalEmp}</b>
✅ Hadir: <b>${present}</b>
⚠️ Terlambat: <b>${late}</b>
❌ Belum Absen: <b>${totalEmp - present}</b>
📡 Perangkat: <b>${Number(devicesOnline.count)}/${Number(devicesTotal.count)}</b> online`);
	}

	private async cmdHadir(chatId: number) {
		const { start, end } = this.todayRange();
		const logs = await this.db.select({ name: schema.employees.name, timestamp: schema.attendanceLogs.timestamp, status: schema.attendanceLogs.status })
			.from(schema.attendanceLogs)
			.innerJoin(schema.employees, eq(schema.attendanceLogs.employeeId, schema.employees.id))
			.where(and(eq(schema.attendanceLogs.type, "IN"), between(schema.attendanceLogs.timestamp, start, end)));

		if (!logs.length) return this.send(chatId, "📋 Belum ada yang absen hari ini.");

		const list = logs.map((l) => {
			const time = new Date(l.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
			const icon = l.status === "LATE" ? "⚠️" : "✅";
			return `${icon} ${l.name} (${time})`;
		}).join("\n");

		await this.send(chatId, `<b>✅ Hadir Hari Ini (${logs.length})</b>\n━━━━━━━━━━━━━━━━━━\n${list}`);
	}

	private async cmdBelum(chatId: number) {
		const { start, end } = this.todayRange();
		const presentIds = await this.db.select({ id: schema.attendanceLogs.employeeId })
			.from(schema.attendanceLogs)
			.where(and(eq(schema.attendanceLogs.type, "IN"), between(schema.attendanceLogs.timestamp, start, end)));

		const presentSet = new Set(presentIds.map((r) => r.id));
		const allEmployees = await this.db.select({ id: schema.employees.id, name: schema.employees.name })
			.from(schema.employees).where(eq(schema.employees.isActive, true));

		const belum = allEmployees.filter((e) => !presentSet.has(e.id));
		if (!belum.length) return this.send(chatId, "🎉 Semua pegawai sudah absen!");

		const list = belum.map((e) => `❌ ${e.name}`).join("\n");
		await this.send(chatId, `<b>❌ Belum Absen (${belum.length})</b>\n━━━━━━━━━━━━━━━━━━\n${list}`);
	}

	private async cmdTerlambat(chatId: number) {
		const { start, end } = this.todayRange();
		const logs = await this.db.select({ name: schema.employees.name, timestamp: schema.attendanceLogs.timestamp })
			.from(schema.attendanceLogs)
			.innerJoin(schema.employees, eq(schema.attendanceLogs.employeeId, schema.employees.id))
			.where(and(eq(schema.attendanceLogs.type, "IN"), eq(schema.attendanceLogs.status, "LATE"), between(schema.attendanceLogs.timestamp, start, end)));

		if (!logs.length) return this.send(chatId, "✅ Tidak ada yang terlambat hari ini!");

		const list = logs.map((l) => {
			const time = new Date(l.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
			return `⚠️ ${l.name} (${time})`;
		}).join("\n");

		await this.send(chatId, `<b>⚠️ Terlambat Hari Ini (${logs.length})</b>\n━━━━━━━━━━━━━━━━━━\n${list}`);
	}

	private shortName(name: string): string {
		const titles = ["dr.", "dr", "drg.", "drg", "ir.", "ir", "prof.", "prof", "hj.", "hj", "h.", "s.kep."];
		const parts = name.replace(/,/g, "").split(" ").filter((p) => p.length > 0);
		// Skip semua title di depan
		let i = 0;
		while (i < parts.length - 1 && titles.includes(parts[i].toLowerCase())) i++;
		const result = parts[i] || name;
		return result.length === 1 && parts.length > 1 ? parts.slice(i).join("") : result;
	}

	private async cmdRekap(chatId: number) {
		const now = new Date();
		const startMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1) - 7 * 60 * 60 * 1000);
		const endMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) - 7 * 60 * 60 * 1000);

		const employees = await this.db.select({ id: schema.employees.id, name: schema.employees.name, shiftId: schema.employees.shiftId })
			.from(schema.employees).where(eq(schema.employees.isActive, true));

		const shifts = await this.db.select().from(schema.shifts);

		const logs = await this.db.select({ employeeId: schema.attendanceLogs.employeeId, timestamp: schema.attendanceLogs.timestamp, type: schema.attendanceLogs.type })
			.from(schema.attendanceLogs)
			.where(between(schema.attendanceLogs.timestamp, startMonth, endMonth));

		const leaves = await this.db.select({ employeeId: schema.leaves.employeeId, startDate: schema.leaves.startDate, endDate: schema.leaves.endDate })
			.from(schema.leaves)
			.where(eq(schema.leaves.status, "APPROVED"));

		const parseTime = (t: string) => { const [h, m] = t.split(":"); return Number(h) * 60 + Number(m); };

		// Hitung hari kerja yang sudah lewat bulan ini
		const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
		const today = now.getDate();

		const rows = employees.map((emp) => {
			const empLogs = logs.filter((l) => l.employeeId === emp.id);
			const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
			const inLogs = empLogs.filter((l) => l.type === "IN");

			// Group by date, ambil log IN pertama per hari
			const dayMap = new Map<string, Date>();
			for (const log of inLogs) {
				const key = `${log.timestamp.getFullYear()}-${log.timestamp.getMonth()}-${log.timestamp.getDate()}`;
				if (!dayMap.has(key)) dayMap.set(key, log.timestamp);
			}

			let hadir = dayMap.size;
			let telat = 0;
			let cuti = 0;

			for (const [key, ts] of dayMap.entries()) {
				const dow = ts.getDay();
				const dateStr = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
				const shift = shifts.find((s) => s.isActive && (s.workDays as number[])?.includes(dow) && s.effectiveFrom && s.effectiveTo && dateStr >= s.effectiveFrom && dateStr <= s.effectiveTo)
					|| shifts.find((s) => s.isActive && (s.workDays as number[])?.includes(dow) && !s.effectiveFrom && !s.effectiveTo);
				if (shift) {
					const cutoff = parseTime(shift.startTime) + (shift.toleranceMinutes ?? 0);
					const scanMin = ts.getHours() * 60 + ts.getMinutes();
					if (scanMin > cutoff) telat++;
				}
			}

			// Hitung cuti/izin pada hari kerja
			for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
				const date = new Date(now.getFullYear(), now.getMonth(), d);
				const dow = date.getDay();
				const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
				const hasShift = shifts.find((s) => s.isActive && (s.workDays as number[])?.includes(dow) && s.effectiveFrom && s.effectiveTo && dateStr >= s.effectiveFrom && dateStr <= s.effectiveTo)
					|| shifts.find((s) => s.isActive && (s.workDays as number[])?.includes(dow) && !s.effectiveFrom && !s.effectiveTo);
				if (!hasShift) continue;
				if (empLeaves.some((l) => dateStr >= l.startDate && dateStr <= l.endDate)) cuti++;
			}

			return { name: this.shortName(emp.name), hadir, telat, cuti };
		}).sort((a, b) => b.hadir - a.hadir);

		const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
		const totalHadir = rows.reduce((s, r) => s + r.hadir, 0);
		const totalTelat = rows.reduce((s, r) => s + r.telat, 0);
		const totalCuti = rows.reduce((s, r) => s + r.cuti, 0);

		const lines = rows.map((r, i) =>
			`${String(i + 1).padStart(2)}. ${r.name} - H:${r.hadir} T:${r.telat}${r.cuti ? ` C:${r.cuti}` : ""}`
		);

		let msg = `<b>📅 Rekap ${monthName}</b>\n━━━━━━━━━━━━━━━━━━\n`;
		msg += `✅ Hadir: <b>${totalHadir}</b> | ⚠️ Telat: <b>${totalTelat}</b> | 📋 Cuti: <b>${totalCuti}</b>\n\n`;
		msg += `<code>${lines.join("\n")}</code>`;

		await this.send(chatId, msg);
	}

	private async cmdCari(chatId: number, nama: string) {
		if (!nama.trim()) return this.send(chatId, "ℹ️ Gunakan: /cari [nama]\nContoh: /cari Budi");

		const employees = await this.db.select().from(schema.employees)
			.where(sql`lower(${schema.employees.name}) like ${`%${nama.toLowerCase()}%`}`);

		if (!employees.length) return this.send(chatId, `🔍 Pegawai "${nama}" tidak ditemukan.`);

		const { start, end } = this.todayRange();
		const results: string[] = [];

		for (const emp of employees.slice(0, 5)) {
			const logs = await this.db.select({ type: schema.attendanceLogs.type, timestamp: schema.attendanceLogs.timestamp, status: schema.attendanceLogs.status })
				.from(schema.attendanceLogs)
				.where(and(eq(schema.attendanceLogs.employeeId, emp.id), between(schema.attendanceLogs.timestamp, start, end)));

			const inLog = logs.find((l) => l.type === "IN");
			const outLog = logs.find((l) => l.type === "OUT");
			const statusText = !inLog ? "Belum absen" : inLog.status === "LATE" ? "Terlambat" : "Hadir";
			const inTime = inLog ? new Date(inLog.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
			const outTime = outLog ? new Date(outLog.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

			results.push(`👤 <b>${emp.name}</b> (${emp.employeeCode})
   📊 Status: ${statusText}
   🕒 Masuk: ${inTime} | Pulang: ${outTime}`);
		}

		await this.send(chatId, `<b>🔍 Hasil Pencarian</b>\n━━━━━━━━━━━━━━━━━━\n${results.join("\n\n")}`);
	}

	private async cmdPegawai(chatId: number) {
		const [active] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.employees).where(eq(schema.employees.isActive, true));
		const [inactive] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.employees).where(eq(schema.employees.isActive, false));
		const [withFp] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.employees).where(sql`${schema.employees.biometricId} is not null`);

		await this.send(chatId, `<b>👥 Info Pegawai</b>
━━━━━━━━━━━━━━━━━━
✅ Aktif: <b>${Number(active.count)}</b>
❌ Nonaktif: <b>${Number(inactive.count)}</b>
🖐️ Sidik Jari Terdaftar: <b>${Number(withFp.count)}</b>`);
	}

	private async cmdPerangkat(chatId: number) {
		const devices = await this.db.select().from(schema.devices);
		if (!devices.length) return this.send(chatId, "📡 Belum ada perangkat terdaftar.");

		const list = devices.map((d) => {
			const icon = d.isOnline ? "🟢" : "🔴";
			const lastSeen = d.lastSeen ? new Date(d.lastSeen).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-";
			return `${icon} <b>${d.name}</b>\n   SN: ${d.serialNumber}\n   Last: ${lastSeen}`;
		}).join("\n\n");

		await this.send(chatId, `<b>📡 Status Perangkat</b>\n━━━━━━━━━━━━━━━━━━\n${list}`);
	}

	private async cmdShift(chatId: number) {
		const shifts = await this.db.select().from(schema.shifts).where(eq(schema.shifts.isActive, true));
		if (!shifts.length) return this.send(chatId, "⏰ Belum ada shift aktif.");

		const list = shifts.map((s) => `⏰ <b>${s.name}</b>\n   ${s.startTime} - ${s.endTime} (toleransi ${s.toleranceMinutes} menit)`).join("\n\n");
		await this.send(chatId, `<b>⏰ Shift Aktif</b>\n━━━━━━━━━━━━━━━━━━\n${list}`);
	}

	private async cmdLibur(chatId: number) {
		const now = new Date();
		const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
		const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

		const holidays = await this.db.select().from(schema.holidays)
			.where(and(gte(schema.holidays.date, startMonth), lte(schema.holidays.date, endMonth)));

		if (!holidays.length) return this.send(chatId, "📅 Tidak ada hari libur bulan ini.");

		const list = holidays.map((h) => `🎉 <b>${h.date}</b> - ${h.name}`).join("\n");
		const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
		await this.send(chatId, `<b>📅 Hari Libur ${monthName}</b>\n━━━━━━━━━━━━━━━━━━\n${list}`);
	}

	// --- Public methods for notifications ---

	async sendNotification(message: string, chatId?: string) {
		if (!this.enabled) return;
		const id = chatId || this.chatId;
		if (!id) return;
		await this.send(Number(id), message);
	}

	async sendAttendanceAlert(data: { name: string; time: string; type: string; status: string; device: string }) {
		if (!this.chatId) return;
		const icon = data.type === "IN" ? "✅" : "🚪";
		const statusIcon = data.status === "LATE" ? "⚠️" : "";
		await this.send(Number(this.chatId), `<b>${icon} Absensi Baru</b>
━━━━━━━━━━━━━━
👤 <b>${data.name}</b>
🕒 ${data.time}
🏷️ ${data.type === "IN" ? "Masuk" : "Keluar"} ${statusIcon}
📍 ${data.device}`);
	}

	// --- Helpers ---

	private async send(chatId: number, text: string) {
		await this.apiCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
	}

	private async apiCall(method: string, body?: Record<string, unknown>) {
		const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		return res.json();
	}
}
