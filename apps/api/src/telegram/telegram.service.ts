import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TelegramService {
	private readonly logger = new Logger(TelegramService.name);
	private readonly enabled: boolean;
	private readonly token: string;
	private readonly chatId: string;

	constructor(
		private readonly configService: ConfigService,
		@Inject("TELEGRAM_ENABLED") @Optional() enabled?: boolean,
	) {
		this.enabled = enabled ?? false;
		this.token = this.configService.get<string>("TELEGRAM_TOKEN") || "";
		this.chatId = this.configService.get<string>("TELEGRAM_CHAT_ID") || "";
		if (!this.enabled) {
			this.logger.warn("Telegram notifications disabled (no valid token)");
		}
	}

	async sendNotification(message: string, chatId?: string) {
		if (!this.enabled) return;
		const id = chatId || this.chatId;
		if (!id) return;

		try {
			const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
			await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ chat_id: id, text: message, parse_mode: "HTML" }),
			});
		} catch (error) {
			this.logger.error("Failed to send Telegram notification", (error as Error).message);
		}
	}

	async sendAttendanceAlert(data: {
		name: string;
		time: string;
		type: string;
		status: string;
		device: string;
	}) {
		const icon = data.type === "IN" ? "✅" : "🚪";
		const statusIcon = data.status === "LATE" ? "⚠️" : "";
		const message = `<b>${icon} Absensi Baru</b>
━━━━━━━━━━━━━━
👤 <b>Nama:</b> ${data.name}
🕒 <b>Waktu:</b> ${data.time}
🏷️ <b>Tipe:</b> ${data.type}
📊 <b>Status:</b> ${data.status} ${statusIcon}
📍 <b>Mesin:</b> ${data.device}`;

		await this.sendNotification(message);
	}
}
