import * as schema from "@adms/database";
import { and, between, eq, gte, lte, sql } from "drizzle-orm";

type Db = typeof schema.db;
type Logger = Pick<Console, "error" | "info" | "warn">;
type InlineKeyboard = {
	inline_keyboard: { text: string; callback_data: string }[][];
};

type TelegramUpdate = {
	update_id: number;
	message?: {
		chat: { id: number };
		text?: string;
		message_id: number;
		reply_to_message?: { text: string };
	};
	callback_query?: {
		id: string;
		message: { chat: { id: number }; message_id: number };
		data: string;
	};
};

export class TelegramBot {
	private offset = 0;
	private polling = false;
	private token = "";
	private chatId = "";

	constructor(
		private db: Db,
		private logger: Logger = console,
	) {}

	async refreshSettings() {
		let rows: { key: string; value: string | null }[] = [];
		try {
			rows = await this.db
				.select({ key: schema.settings.key, value: schema.settings.value })
				.from(schema.settings)
				.where(
					sql`${schema.settings.key} in ('TELEGRAM_TOKEN', 'TELEGRAM_CHAT_ID')`,
				);
		} catch (error) {
			this.logger.warn(
				`Telegram settings unavailable: ${(error as Error).message}`,
			);
		}
		const settings = Object.fromEntries(
			rows.map((row) => [row.key, row.value ?? ""]),
		);
		this.token = settings.TELEGRAM_TOKEN || process.env.TELEGRAM_TOKEN || "";
		this.chatId =
			settings.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
	}

	async start() {
		await this.refreshSettings();
		if (!this.token) {
			this.logger.warn("Telegram bot disabled (no token configured)");
			return;
		}
		await this.apiCall("setMyCommands", {
			commands: [
				{ command: "start", description: "Menu utama" },
				{ command: "dashboard", description: "Ringkasan hari ini" },
				{ command: "bind", description: "Hubungkan NIP" },
				{ command: "absenku", description: "Cek absen pribadi" },
				{ command: "izin", description: "Ajukan izin" },
			],
		});
		this.polling = true;
		void this.poll();
	}

	stop() {
		this.polling = false;
	}

	async sendNotification(message: string, chatId = this.chatId) {
		if (!this.token || !chatId) return;
		await this.apiCall("sendMessage", {
			chat_id: Number(chatId),
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
		const icon = data.type === "IN" ? "✅" : "🚪";
		const statusIcon = data.status === "LATE" ? " ⚠️" : "";
		await this.sendNotification(`<b>${icon} Absensi Baru</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>${data.name}</b>
🕒 ${data.time}
🏷️ ${data.type === "IN" ? "Masuk" : "Keluar"}${statusIcon}
📍 ${data.device}`);
	}

	private async poll() {
		while (this.polling) {
			try {
				const data = await this.apiCall<{
					ok: boolean;
					result?: TelegramUpdate[];
				}>("getUpdates", { offset: this.offset, timeout: 30 });
				for (const update of data.result ?? []) {
					this.offset = update.update_id + 1;
					if (update.message?.text) await this.handleMessage(update.message);
					if (update.callback_query)
						await this.handleCallback(update.callback_query);
				}
			} catch (error) {
				this.logger.error(
					`Telegram polling error: ${(error as Error).message}`,
				);
				await new Promise((resolve) => setTimeout(resolve, 5000));
			}
		}
	}

	private async handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
		const chatId = message.chat.id;
		if (message.reply_to_message?.text.includes("NIP Anda")) {
			return this.bind(chatId, message.text?.trim());
		}
		if (message.reply_to_message?.text.includes("alasan/keterangan izin")) {
			return this.requestLeave(chatId, message.text?.trim() ?? "");
		}
		const [rawCommand = "", ...args] = (message.text ?? "").trim().split(/\s+/);
		const command = rawCommand.replace(/@\w+/g, "").toLowerCase();
		switch (command) {
			case "/start":
			case "/menu":
				return this.sendMenu(chatId);
			case "/dashboard":
				return this.sendNotification(await this.dashboard(), String(chatId));
			case "/bind":
				return this.bind(chatId, args[0]);
			case "/absenku":
				return this.myAttendance(chatId);
			case "/izin":
				return this.requestLeave(chatId, args.join(" "));
		}
	}

	private async handleCallback(
		callback: NonNullable<TelegramUpdate["callback_query"]>,
	) {
		await this.apiCall("answerCallbackQuery", {
			callback_query_id: callback.id,
		});
		const chatId = callback.message.chat.id;
		if (callback.data === "act_dashboard") {
			return this.sendNotification(await this.dashboard(), String(chatId));
		}
		if (callback.data === "act_bind") {
			return this.forceReply(
				chatId,
				"🔗 <b>Bind Akun</b>\nSilakan balas pesan ini dengan NIP Anda:",
			);
		}
		if (callback.data === "act_absenku") return this.myAttendance(chatId);
		if (callback.data === "act_izin") {
			return this.forceReply(
				chatId,
				"🏖️ <b>Pengajuan Izin</b>\nSilakan balas pesan ini dengan alasan/keterangan izin Anda:",
			);
		}
		return this.sendMenu(chatId);
	}

	private menuKeyboard(): InlineKeyboard {
		return {
			inline_keyboard: [
				[{ text: "📊 Dashboard", callback_data: "act_dashboard" }],
				[
					{ text: "🔗 Bind Akun", callback_data: "act_bind" },
					{ text: "📋 Cek Absenku", callback_data: "act_absenku" },
				],
				[{ text: "🏖️ Ajukan Izin", callback_data: "act_izin" }],
			],
		};
	}

	private async sendMenu(chatId: number) {
		await this.apiCall("sendMessage", {
			chat_id: chatId,
			text: "<b>🏢 ADMS Attendance Bot</b>\n━━━━━━━━━━━━━━━━━━━━━\nPilih layanan di bawah.",
			parse_mode: "HTML",
			reply_markup: this.menuKeyboard(),
		});
	}

	private async dashboard() {
		const { start, end } = this.todayRange();
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
		const [online] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.devices)
			.where(eq(schema.devices.isOnline, true));
		const [devices] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(schema.devices);
		const total = Number(employees?.count ?? 0);
		const present = new Set(logs.map((log) => log.employeeId)).size;
		const late = logs.filter((log) => log.status === "LATE").length;
		return `<b>📊 Dashboard Hari Ini</b>\n━━━━━━━━━━━━━━━━━━━━━\n👥 Total Pegawai: <b>${total}</b>\n✅ Hadir: <b>${present}</b>\n⚠️ Terlambat: <b>${late}</b>\n❌ Belum Absen: <b>${Math.max(0, total - present)}</b>\n📡 Perangkat: <b>${Number(online?.count ?? 0)}/${Number(devices?.count ?? 0)}</b> online`;
	}

	private async bind(chatId: number, employeeCode?: string) {
		if (!employeeCode)
			return this.forceReply(
				chatId,
				"Silakan balas pesan ini dengan NIP Anda:",
			);
		const [employee] = await this.db
			.select()
			.from(schema.employees)
			.where(eq(schema.employees.employeeCode, employeeCode));
		if (!employee)
			return this.sendNotification(
				`❌ Pegawai dengan NIP <b>${employeeCode}</b> tidak ditemukan.`,
				String(chatId),
			);
		await this.db
			.update(schema.employees)
			.set({ telegramChatId: String(chatId), updatedAt: new Date() })
			.where(eq(schema.employees.id, employee.id));
		return this.sendNotification(
			`✅ Akun Telegram terhubung dengan <b>${employee.name}</b>.`,
			String(chatId),
		);
	}

	private async myAttendance(chatId: number) {
		const [employee] = await this.db
			.select()
			.from(schema.employees)
			.where(eq(schema.employees.telegramChatId, String(chatId)));
		if (!employee)
			return this.sendNotification(
				"⚠️ Akun belum terhubung. Gunakan /bind [NIP].",
				String(chatId),
			);
		const now = new Date();
		const logs = await this.db
			.select()
			.from(schema.attendanceLogs)
			.where(
				and(
					eq(schema.attendanceLogs.employeeId, employee.id),
					gte(
						schema.attendanceLogs.timestamp,
						new Date(now.getFullYear(), now.getMonth(), 1),
					),
					lte(
						schema.attendanceLogs.timestamp,
						new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
					),
				),
			);
		const present = new Set(logs.map((log) => log.timestamp.getDate())).size;
		const late = logs.filter((log) => log.status === "LATE").length;
		return this.sendNotification(
			`👤 <b>Halo, ${employee.name}</b>\n━━━━━━━━━━━━━━━━━━━━━\n✅ Kehadiran: <b>${present} hari</b>\n⚠️ Terlambat: <b>${late} kali</b>`,
			String(chatId),
		);
	}

	private async requestLeave(chatId: number, reason: string) {
		if (!reason)
			return this.forceReply(
				chatId,
				"Silakan balas pesan ini dengan alasan/keterangan izin Anda:",
			);
		const [employee] = await this.db
			.select()
			.from(schema.employees)
			.where(eq(schema.employees.telegramChatId, String(chatId)));
		if (!employee)
			return this.sendNotification(
				"⚠️ Akun belum terhubung. Gunakan /bind [NIP].",
				String(chatId),
			);
		const now = new Date();
		const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		await this.db.insert(schema.leaves).values({
			employeeId: employee.id,
			type: "PERMISSION",
			startDate: today,
			endDate: today,
			reason,
			status: "PENDING",
		});
		await this.sendNotification(
			`📨 <b>PENGAJUAN IZIN BARU</b>\n👤 ${employee.name}\n📝 ${reason}\n📅 ${today}`,
		);
		return this.sendNotification(
			"✅ Pengajuan izin berhasil dikirim.",
			String(chatId),
		);
	}

	private async forceReply(chatId: number, text: string) {
		await this.apiCall("sendMessage", {
			chat_id: chatId,
			text,
			parse_mode: "HTML",
			reply_markup: { force_reply: true, selective: true },
		});
	}

	private todayRange() {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		return { start, end: new Date(start.getTime() + 86_400_000 - 1) };
	}

	private async apiCall<T = unknown>(
		method: string,
		body: Record<string, unknown>,
	) {
		if (!this.token) throw new Error("Telegram token is not configured");
		const response = await fetch(
			`https://api.telegram.org/bot${this.token}/${method}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(35_000),
			},
		);
		const result = (await response.json()) as T & {
			ok?: boolean;
			description?: string;
		};
		if (!response.ok || result.ok === false)
			throw new Error(result.description || `Telegram HTTP ${response.status}`);
		return result;
	}
}
