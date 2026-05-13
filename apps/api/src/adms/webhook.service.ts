import { createHmac } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";

export interface WebhookPayload {
	sn: string;
	timestamp: string;
	user_id: string;
	verify: number;
	status: number;
	workcode: number;
}

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name);

	/**
	 * Forward attendance data ke webhook URL(s) dengan signature security.
	 * Format signature: sha256(timestamp + secret)
	 */
	async forward(
		webhookUrls: string,
		secret: string | null,
		payload: WebhookPayload,
	) {
		const urls = webhookUrls.split(",").map((u) => u.trim()).filter(Boolean);
		const timestamp = Math.floor(Date.now() / 1000).toString();

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"x-adms-timestamp": timestamp,
		};

		if (secret) {
			const signature = createHmac("sha256", secret)
				.update(timestamp + secret)
				.digest("hex");
			headers["x-adms-signature"] = `sha256=${signature}`;
		}

		for (const url of urls) {
			try {
				await fetch(url, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(10000),
				});
				this.logger.debug(`Webhook sent to ${url}`);
			} catch (error) {
				this.logger.warn(`Webhook failed for ${url}: ${(error as Error).message}`);
			}
		}
	}
}
