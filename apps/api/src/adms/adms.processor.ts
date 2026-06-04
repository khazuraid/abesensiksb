import * as schema from "@adms/database";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";
import { EventsGateway } from "../events/events.gateway";
import { TelegramService } from "../telegram/telegram.service";
import { WebhookService } from "./webhook.service";

@Processor("adms-logs")
export class ADMSProcessor extends WorkerHost {
	private readonly logger = new Logger(ADMSProcessor.name);

	constructor(
		@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
		private readonly telegramService: TelegramService,
		private readonly webhookService: WebhookService,
		private readonly eventsGateway: EventsGateway,
	) {
		super();
	}

	async process(
		job: Job<{
			sn: string;
			log: {
				employeeId: number;
				deviceId: number | null;
				timestamp: Date;
				type: "IN" | "OUT";
				status: "PRESENT" | "LATE" | "ABSENT";
			};
		}>,
	): Promise<{ success: boolean }> {
		const { sn, log } = job.data;
		log.timestamp = new Date(log.timestamp);

		try {
			// 1. Simpan ke database
			await this.db.insert(schema.attendanceLogs).values(log);

			// 2. Ambil data employee & device
			const [employee] = await this.db
				.select()
				.from(schema.employees)
				.where(eq(schema.employees.id, log.employeeId));

			let device: typeof schema.devices.$inferSelect | undefined;
			if (log.deviceId) {
				[device] = await this.db
					.select()
					.from(schema.devices)
					.where(eq(schema.devices.id, log.deviceId));
			}

			// 3. Forward ke webhook (jika device punya webhook_url)
			if (device?.webhookUrl) {
				await this.webhookService.forward(
					device.webhookUrl,
					device.webhookSecret ?? null,
					{
						sn,
						timestamp: new Date(log.timestamp)
							.toISOString()
							.replace("T", " ")
							.substring(0, 19),
						user_id:
							employee?.biometricId ||
							employee?.employeeCode ||
							String(log.employeeId),
						verify: 1,
						status: log.type === "IN" ? 0 : 1,
						workcode: 0,
					},
				);
			}

			// 4. Kirim notifikasi Telegram
			await this.telegramService.sendAttendanceAlert({
				name: employee?.name || "Unknown",
				time: new Intl.DateTimeFormat("id-ID", {
					dateStyle: "medium",
					timeStyle: "short",
				}).format(new Date(log.timestamp)),
				type: log.type,
				status: log.status,
				device: device?.name || sn,
			});

			// 5. Broadcast to WebSockets
			this.eventsGateway.broadcastNewLog({
				sn,
				...log,
				employeeName: employee?.name || "Unknown",
			});

			return { success: true };
		} catch (error) {
			this.logger.error(
				`Failed to process job ${job.id}`,
				(error as Error).stack,
			);
			throw error;
		}
	}

	@OnWorkerEvent("completed")
	onCompleted(job: Job) {
		this.logger.log(`Job ${job.id} completed`);
	}

	@OnWorkerEvent("failed")
	onFailed(job: Job, error: Error) {
		this.logger.error(`Job ${job.id} failed: ${error.message}`);
	}
}
