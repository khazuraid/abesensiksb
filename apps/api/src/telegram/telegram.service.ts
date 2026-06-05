import * as schema from "@adms/database";
import {
	Inject,
	Injectable,
	Logger,
	OnModuleInit,
	Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, between, eq, gte, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

type InlineButton = { text: string; callback_data: string };
type InlineKeyboard = { inline_keyboard: InlineButton[][] };

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
		];
		await this.apiCall("setMyCommands", { commands });
		this.logger.log("Bot commands registered");
	}

	private startPolling() {
		if (this.polling) return;
		this.polling = true;
		void this.poll();
	}

	private async poll() {
		while (this.polling) {
			try {
				const data = await this.apiCall<{
					result?: {
						update_id: number;
						message?: {
							chat: { id: number };
							text?: string;
							message_id: number;
						};
						callback_query?: {
							id: string;
							message: { chat: { id: number }; message_id: number };
							data: string;
						};
					}[];
				}>("getUpdates", {
					offset: this.offset,
					timeout: 30,
				});
				if (data?.result?.length) {
					for (const update of data.result) {
						this.offset = update.update_id + 1;
						if (update.message?.text) {
							await this.handleMessage(
								update.message as { chat: { id: number }; text: string },
							);
						}
						if (update.callback_query) {
							await this.handleCallback(update.callback_query);
						}
					}
				}
			} catch (e) {
				this.logger.error(`Polling error: ${(e as Error).message}`);
				await new Promise((r) => setTimeout(r, 5000));
			}
		}
	}

	// ─── Message Handler ───────────────────────────────────────

	private async handleMessage(msg: { chat: { id: number }; text: string }) {
		const chatId = msg.chat.id;
		const command = msg.text.split(" ")[0].replace(/@\w+/g, "").toLowerCase();

		switch (command) {
			case "/start":
			case "/menu":
				return this.sendMainMenu(chatId);
			case "/dashboard":
				return this.cmdDashboard(chatId);
		}
	}

	// ─── Callback Handler ──────────────────────────────────────

	private async handleCallback(cb: {
		id: string;
		message: { chat: { id: number }; message_id: number };
		data: string;
	}) {
		const chatId = cb.message.chat.id;
		const msgId = cb.message.message_id;
		const data = cb.data;

		await this.answerCallback(cb.id);

		switch (data) {
			case "menu_main":
				return this.editMainMenu(chatId, msgId);
			case "menu_kehadiran":
				return this.editKehadiranMenu(chatId, msgId);
			case "menu_kepegawaian":
				return this.editKepegawaianMenu(chatId, msgId);
			case "menu_sistem":
				return this.editSistemMenu(chatId, msgId);
			case "act_dashboard":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getDashboardText(),
					this.backButton("menu_main"),
				);
			case "act_hadir":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getHadirText(),
					this.backButton("menu_kehadiran"),
				);
			case "act_belum":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getBelumText(),
					this.backButton("menu_kehadiran"),
				);
			case "act_terlambat":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getTerlambatText(),
					this.backButton("menu_kehadiran"),
				);
			case "act_rekap":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getRekapText(),
					this.backButton("menu_kehadiran"),
				);
			case "act_pegawai":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getPegawaiText(),
					this.backButton("menu_kepegawaian"),
				);
			case "act_shift":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getShiftText(),
					this.backButton("menu_kepegawaian"),
				);
			case "act_libur":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getLiburText(),
					this.backButton("menu_kepegawaian"),
				);
			case "act_perangkat":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getPerangkatText(),
					this.backButton("menu_sistem"),
				);
			case "act_refresh":
				return this.editWithData(
					chatId,
					msgId,
					() => this.getDashboardText(),
					this.backButton("menu_main"),
				);
		}
	}

	// ─── Menu Layouts ──────────────────────────────────────────

	private mainMenuText(): string {
		return `<b>🏢 ADMS Attendance Bot</b>
━━━━━━━━━━━━━━━━━━━━━
Selamat datang! Pilih menu di bawah untuk melihat informasi kehadiran dan kepegawaian.

<i>Pilih kategori:</i>`;
	}

	private mainMenuKeyboard(): InlineKeyboard {
		return {
			inline_keyboard: [
				[{ text: "📊 Dashboard", callback_data: "act_dashboard" }],
				[
					{ text: "📋 Kehadiran", callback_data: "menu_kehadiran" },
					{ text: "👥 Kepegawaian", callback_data: "menu_kepegawaian" },
				],
				[{ text: "⚙️ Sistem", callback_data: "menu_sistem" }],
			],
		};
	}

	private kehadiranMenuKeyboard(): InlineKeyboard {
		return {
			inline_keyboard: [
				[
					{ text: "✅ Hadir", callback_data: "act_hadir" },
					{ text: "❌ Belum Absen", callback_data: "act_belum" },
				],
				[
					{ text: "⚠️ Terlambat", callback_data: "act_terlambat" },
					{ text: "📅 Rekap Bulan", callback_data: "act_rekap" },
				],
				[{ text: "⬅️ Kembali", callback_data: "menu_main" }],
			],
		};
	}

	private kepegawaianMenuKeyboard(): InlineKeyboard {
		return {
			inline_keyboard: [
				[
					{ text: "👤 Info Pegawai", callback_data: "act_pegawai" },
					{ text: "⏰ Shift", callback_data: "act_shift" },
				],
				[{ text: "🎉 Hari Libur", callback_data: "act_libur" }],
				[{ text: "⬅️ Kembali", callback_data: "menu_main" }],
			],
		};
	}

	private sistemMenuKeyboard(): InlineKeyboard {
		return {
			inline_keyboard: [
				[{ text: "📡 Status Perangkat", callback_data: "act_perangkat" }],
				[{ text: "⬅️ Kembali", callback_data: "menu_main" }],
			],
		};
	}

	private backButton(target: string): InlineKeyboard {
		return {
			inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: target }]],
		};
	}

	// ─── Send / Edit Helpers ───────────────────────────────────

	private async sendMainMenu(chatId: number) {
		await this.apiCall("sendMessage", {
			chat_id: chatId,
			text: this.mainMenuText(),
			parse_mode: "HTML",
			reply_markup: this.mainMenuKeyboard(),
		});
	}

	private async editMainMenu(chatId: number, msgId: number) {
		await this.editMessage(
			chatId,
			msgId,
			this.mainMenuText(),
			this.mainMenuKeyboard(),
		);
	}

	private async editKehadiranMenu(chatId: number, msgId: number) {
		const text = `<b>📋 Menu Kehadiran</b>
━━━━━━━━━━━━━━━━━━━━━
Lihat data kehadiran pegawai hari ini atau rekap bulanan.

<i>Pilih informasi:</i>`;
		await this.editMessage(chatId, msgId, text, this.kehadiranMenuKeyboard());
	}

	private async editKepegawaianMenu(chatId: number, msgId: number) {
		const text = `<b>👥 Menu Kepegawaian</b>
━━━━━━━━━━━━━━━━━━━━━
Informasi pegawai, shift kerja, dan hari libur.

<i>Pilih informasi:</i>`;
		await this.editMessage(chatId, msgId, text, this.kepegawaianMenuKeyboard());
	}

	private async editSistemMenu(chatId: number, msgId: number) {
		const text = `<b>⚙️ Menu Sistem</b>
━━━━━━━━━━━━━━━━━━━━━
Monitoring perangkat dan status sistem.

<i>Pilih informasi:</i>`;
		await this.editMessage(chatId, msgId, text, this.sistemMenuKeyboard());
	}

	private async editWithData(
		chatId: number,
		msgId: number,
		getData: () => Promise<string>,
		keyboard: InlineKeyboard,
	) {
		const text = await getData();
		await this.editMessage(chatId, msgId, text, keyboard);
	}

	private async editMessage(
		chatId: number,
		msgId: number,
		text: string,
		keyboard: InlineKeyboard,
	) {
		await this.apiCall("editMessageText", {
			chat_id: chatId,
			message_id: msgId,
			text,
			parse_mode: "HTML",
			reply_markup: keyboard,
		});
	}

	// ─── Data Fetchers ─────────────────────────────────────────

	private todayRange() {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const end = new Date(start.getTime() + 86400000 - 1);
		return { start, end };
	}

	private async getDashboardText(): Promise<string> {
		const { start, end } = this.todayRange();
		const [employees] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));
		const totalEmp = Number(employees.count);

		const todayLogs = await this.db
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

		const present = new Set(todayLogs.map((l) => l.employeeId)).size;
		const late = todayLogs.filter((l) => l.status === "LATE").length;

		const [devicesOnline] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.devices)
			.where(eq(schema.devices.isOnline, true));
		const [devicesTotal] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.devices);

		const now = new Date();
		const timeStr = now.toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
		});

		return `<b>📊 Dashboard Hari Ini</b>
━━━━━━━━━━━━━━━━━━━━━
🕒 Update: ${timeStr}

👥 Total Pegawai: <b>${totalEmp}</b>
✅ Hadir: <b>${present}</b> (${totalEmp ? Math.round((present / totalEmp) * 100) : 0}%)
⚠️ Terlambat: <b>${late}</b>
❌ Belum Absen: <b>${totalEmp - present}</b>
📡 Perangkat: <b>${Number(devicesOnline.count)}/${Number(devicesTotal.count)}</b> online`;
	}

	private async cmdDashboard(chatId: number) {
		const text = await this.getDashboardText();
		await this.apiCall("sendMessage", {
			chat_id: chatId,
			text,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[{ text: "🔄 Refresh", callback_data: "act_refresh" }],
					[
						{ text: "📋 Kehadiran", callback_data: "menu_kehadiran" },
						{ text: "🏠 Menu", callback_data: "menu_main" },
					],
				],
			},
		});
	}

	private async getHadirText(): Promise<string> {
		const { start, end } = this.todayRange();
		const logs = await this.db
			.select({
				name: schema.employees.name,
				timestamp: schema.attendanceLogs.timestamp,
				status: schema.attendanceLogs.status,
			})
			.from(schema.attendanceLogs)
			.innerJoin(
				schema.employees,
				eq(schema.attendanceLogs.employeeId, schema.employees.id),
			)
			.where(
				and(
					eq(schema.attendanceLogs.type, "IN"),
					between(schema.attendanceLogs.timestamp, start, end),
				),
			);

		if (!logs.length) return "📋 Belum ada yang absen hari ini.";

		const list = logs
			.map((l) => {
				const time = new Date(l.timestamp).toLocaleTimeString("id-ID", {
					hour: "2-digit",
					minute: "2-digit",
				});
				const icon = l.status === "LATE" ? "⚠️" : "✅";
				return `${icon} ${l.name} (${time})`;
			})
			.join("\n");

		return `<b>✅ Hadir Hari Ini (${logs.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}`;
	}

	private async getBelumText(): Promise<string> {
		const { start, end } = this.todayRange();
		const presentIds = await this.db
			.select({ id: schema.attendanceLogs.employeeId })
			.from(schema.attendanceLogs)
			.where(
				and(
					eq(schema.attendanceLogs.type, "IN"),
					between(schema.attendanceLogs.timestamp, start, end),
				),
			);

		const presentSet = new Set(presentIds.map((r) => r.id));
		const allEmployees = await this.db
			.select({ id: schema.employees.id, name: schema.employees.name })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));

		const belum = allEmployees.filter((e) => !presentSet.has(e.id));
		if (!belum.length) return "🎉 Semua pegawai sudah absen!";

		const list = belum.map((e) => `❌ ${e.name}`).join("\n");
		return `<b>❌ Belum Absen (${belum.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}`;
	}

	private async getTerlambatText(): Promise<string> {
		const { start, end } = this.todayRange();
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
			.where(
				and(
					eq(schema.attendanceLogs.type, "IN"),
					eq(schema.attendanceLogs.status, "LATE"),
					between(schema.attendanceLogs.timestamp, start, end),
				),
			);

		if (!logs.length) return "✅ Tidak ada yang terlambat hari ini!";

		const list = logs
			.map((l) => {
				const time = new Date(l.timestamp).toLocaleTimeString("id-ID", {
					hour: "2-digit",
					minute: "2-digit",
				});
				return `⚠️ ${l.name} (${time})`;
			})
			.join("\n");

		return `<b>⚠️ Terlambat Hari Ini (${logs.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}`;
	}

	private shortName(name: string): string {
		const titles = [
			"dr.",
			"dr",
			"drg.",
			"drg",
			"ir.",
			"ir",
			"prof.",
			"prof",
			"hj.",
			"hj",
			"h.",
			"s.kep.",
		];
		const parts = name
			.replace(/,/g, "")
			.split(" ")
			.filter((p) => p.length > 0);
		let i = 0;
		while (i < parts.length - 1 && titles.includes(parts[i].toLowerCase())) i++;
		const result = parts[i] || name;
		return result.length === 1 && parts.length > 1
			? parts.slice(i).join("")
			: result;
	}

	private async getRekapText(): Promise<string> {
		const now = new Date();
		const startMonth = new Date(
			Date.UTC(now.getFullYear(), now.getMonth(), 1) - 7 * 60 * 60 * 1000,
		);
		const endMonth = new Date(
			Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) -
				7 * 60 * 60 * 1000,
		);

		const employees = await this.db
			.select({
				id: schema.employees.id,
				name: schema.employees.name,
				shiftIds: schema.employees.shiftIds,
			})
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));

		const shifts = await this.db.select().from(schema.shifts);

		const logs = await this.db
			.select({
				employeeId: schema.attendanceLogs.employeeId,
				timestamp: schema.attendanceLogs.timestamp,
				type: schema.attendanceLogs.type,
			})
			.from(schema.attendanceLogs)
			.where(between(schema.attendanceLogs.timestamp, startMonth, endMonth));

		const leaves = await this.db
			.select({
				employeeId: schema.leaves.employeeId,
				startDate: schema.leaves.startDate,
				endDate: schema.leaves.endDate,
			})
			.from(schema.leaves)
			.where(eq(schema.leaves.status, "APPROVED"));

		const parseTime = (t: string) => {
			const [h, m] = t.split(":");
			return Number(h) * 60 + Number(m);
		};

		const daysInMonth = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0,
		).getDate();
		const today = now.getDate();

		const rows = employees
			.map((emp) => {
				const empLogs = logs.filter((l) => l.employeeId === emp.id);
				const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
				const dayMap = new Map<string, Date>();
				for (const log of empLogs) {
					const key = `${log.timestamp.getFullYear()}-${log.timestamp.getMonth()}-${log.timestamp.getDate()}`;
					if (!dayMap.has(key)) {
						dayMap.set(key, log.timestamp);
					} else {
						const existing = dayMap.get(key)!;
						if (log.timestamp.getTime() < existing.getTime()) {
							dayMap.set(key, log.timestamp);
						}
					}
				}

				const hadir = dayMap.size;
				let telat = 0;
				let cuti = 0;

				for (const [, ts] of dayMap.entries()) {
					const dow = ts.getDay();
					const dateStr = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
					const shift =
						shifts.find(
							(s) =>
								s.isActive &&
								s.workDays?.includes(dow) &&
								s.effectiveFrom &&
								s.effectiveTo &&
								dateStr >= s.effectiveFrom &&
								dateStr <= s.effectiveTo,
						) ||
						shifts.find(
							(s) =>
								s.isActive &&
								s.workDays?.includes(dow) &&
								!s.effectiveFrom &&
								!s.effectiveTo,
						);
					if (shift) {
						const cutoff =
							parseTime(shift.startTime) + (shift.toleranceMinutes ?? 0);
						const scanMin = ts.getHours() * 60 + ts.getMinutes();
						if (scanMin > cutoff) telat++;
					}
				}

				for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
					const date = new Date(now.getFullYear(), now.getMonth(), d);
					const dow = date.getDay();
					const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
					const hasShift =
						shifts.find(
							(s) =>
								s.isActive &&
								s.workDays?.includes(dow) &&
								s.effectiveFrom &&
								s.effectiveTo &&
								dateStr >= s.effectiveFrom &&
								dateStr <= s.effectiveTo,
						) ||
						shifts.find(
							(s) =>
								s.isActive &&
								s.workDays?.includes(dow) &&
								!s.effectiveFrom &&
								!s.effectiveTo,
						);
					if (!hasShift) continue;
					if (
						empLeaves.some(
							(l) => dateStr >= l.startDate && dateStr <= l.endDate,
						)
					)
						cuti++;
				}

				return { name: this.shortName(emp.name), hadir, telat, cuti };
			})
			.sort((a, b) => b.hadir - a.hadir);

		const monthName = now.toLocaleDateString("id-ID", {
			month: "long",
			year: "numeric",
		});
		const totalHadir = rows.reduce((s, r) => s + r.hadir, 0);
		const totalTelat = rows.reduce((s, r) => s + r.telat, 0);
		const totalCuti = rows.reduce((s, r) => s + r.cuti, 0);

		const lines = rows.map(
			(r, i) =>
				`${String(i + 1).padStart(2)}. ${r.name} - H:${r.hadir} T:${r.telat}${r.cuti ? ` C:${r.cuti}` : ""}`,
		);

		let msg = `<b>📅 Rekap ${monthName}</b>\n━━━━━━━━━━━━━━━━━━━━━\n`;
		msg += `✅ Hadir: <b>${totalHadir}</b> | ⚠️ Telat: <b>${totalTelat}</b> | 📋 Cuti: <b>${totalCuti}</b>\n\n`;
		msg += `<code>${lines.join("\n")}</code>`;
		return msg;
	}

	private async getPegawaiText(): Promise<string> {
		const [active] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));
		const [inactive] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, false));
		const [withFp] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.employees)
			.where(sql`${schema.employees.biometricId} is not null`);

		return `<b>👤 Info Pegawai</b>
━━━━━━━━━━━━━━━━━━━━━
✅ Aktif: <b>${Number(active.count)}</b>
❌ Nonaktif: <b>${Number(inactive.count)}</b>
🖐️ Sidik Jari: <b>${Number(withFp.count)}</b>`;
	}

	private async getShiftText(): Promise<string> {
		const shifts = await this.db
			.select()
			.from(schema.shifts)
			.where(eq(schema.shifts.isActive, true));
		if (!shifts.length) return "⏰ Belum ada shift aktif.";

		const list = shifts
			.map(
				(s) =>
					`⏰ <b>${s.name}</b>\n   ${s.startTime} - ${s.endTime} (toleransi ${s.toleranceMinutes} mnt)`,
			)
			.join("\n\n");
		return `<b>⏰ Shift Aktif</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}`;
	}

	private async getLiburText(): Promise<string> {
		const now = new Date();
		const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
		const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

		const holidays = await this.db
			.select()
			.from(schema.holidays)
			.where(
				and(
					gte(schema.holidays.date, startMonth),
					lte(schema.holidays.date, endMonth),
				),
			);

		if (!holidays.length) return "📅 Tidak ada hari libur bulan ini.";

		const list = holidays
			.map((h) => `🎉 <b>${h.date}</b> - ${h.name}`)
			.join("\n");
		const monthName = now.toLocaleDateString("id-ID", {
			month: "long",
			year: "numeric",
		});
		return `<b>📅 Hari Libur ${monthName}</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}`;
	}

	private async getPerangkatText(): Promise<string> {
		const devices = await this.db.select().from(schema.devices);
		if (!devices.length) return "📡 Belum ada perangkat terdaftar.";

		const list = devices
			.map((d) => {
				const icon = d.isOnline ? "🟢" : "🔴";
				const lastSeen = d.lastSeen
					? new Date(d.lastSeen).toLocaleString("id-ID", {
							dateStyle: "short",
							timeStyle: "short",
						})
					: "-";
				return `${icon} <b>${d.name}</b>\n   SN: ${d.serialNumber} | Last: ${lastSeen}`;
			})
			.join("\n\n");

		return `<b>📡 Status Perangkat</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}`;
	}

	// ─── Public Methods (Notifications) ────────────────────────

	async sendNotification(message: string, chatId?: string) {
		if (!this.enabled) return;
		const id = chatId || this.chatId;
		if (!id) return;
		await this.apiCall("sendMessage", {
			chat_id: Number(id),
			text: message,
			parse_mode: "HTML",
		});
	}

	async sendAttendanceAlert(data: {
		name: string;
		time: string;
		type: string;
		status: string;
		device: string;
	}) {
		if (!this.chatId) return;
		const icon = data.type === "IN" ? "✅" : "🚪";
		const statusIcon = data.status === "LATE" ? " ⚠️" : "";
		await this.apiCall("sendMessage", {
			chat_id: Number(this.chatId),
			text: `<b>${icon} Absensi Baru</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>${data.name}</b>
🕒 ${data.time}
🏷️ ${data.type === "IN" ? "Masuk" : "Keluar"}${statusIcon}
📍 ${data.device}`,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[{ text: "📊 Dashboard", callback_data: "act_dashboard" }],
				],
			},
		});
	}

	// ─── API Helpers ───────────────────────────────────────────

	private async answerCallback(callbackId: string) {
		await this.apiCall("answerCallbackQuery", {
			callback_query_id: callbackId,
		});
	}

	private async apiCall<T = unknown>(
		method: string,
		body?: Record<string, unknown>,
	): Promise<T> {
		const res = await fetch(
			`https://api.telegram.org/bot${this.token}/${method}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			},
		);
		return res.json() as Promise<T>;
	}
}
