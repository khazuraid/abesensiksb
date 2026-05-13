import * as schema from "@adms/database";
import { ADMSRecordSchema } from "@adms/shared-types";
import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Queue } from "bullmq";
import { and, eq, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";
import { ShiftEngineService } from "../shifts/shift-engine.service";

@Injectable()
export class ADMSService {
	private readonly logger = new Logger(ADMSService.name);

	constructor(
		@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
		@InjectQueue("adms-logs") private readonly admsQueue: Queue,
		private readonly shiftEngine: ShiftEngineService,
	) {}

	/**
	 * Mengambil daftar perintah untuk mesin (Polling).
	 */
	async getPendingCommands(sn: string) {
		const deviceResult = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.serialNumber, sn));

		if (deviceResult.length === 0) return "OK";

		const deviceId = deviceResult[0].id;

		const pendingCommands = await this.db
			.select()
			.from(schema.deviceCommands)
			.where(
				and(
					eq(schema.deviceCommands.deviceId, deviceId),
					eq(schema.deviceCommands.status, "PENDING"),
				),
			);

		if (pendingCommands.length === 0) return "OK";

		// Format: C:ID:COMMAND
		const formattedCommands = pendingCommands
			.map((cmd) => `C:${cmd.id}:${cmd.command}`)
			.join("\n");

		// Update status menjadi SENT
		for (const cmd of pendingCommands) {
			await this.db
				.update(schema.deviceCommands)
				.set({ status: "SENT", updatedAt: new Date() })
				.where(eq(schema.deviceCommands.id, cmd.id));
		}

		return formattedCommands;
	}

	/**
	 * Parsing data log dari mesin ADMS dan masukkan ke queue.
	 * Format umum: USERID=1\tCHECKTIME=2024-05-12 08:00:00\tCHECKTYPE=0\tVERIFYCODE=1
	 */
	async handleLogData(sn: string, rawData: string) {
		const lines = rawData.split("\n").filter((line) => line.trim());
		let queued = 0;
		const errors: string[] = [];

		// Cari device sekali untuk efisiensi
		const deviceResult = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.serialNumber, sn));
		const deviceId = deviceResult[0]?.id ?? null;

		for (const line of lines) {
			try {
				// Parsing string mentah ke key-value
				const raw = line.split("\t").reduce(
					(acc, part) => {
						const [key, value] = part.split("=");
						if (key) acc[key] = value;
						return acc;
					},
					{} as Record<string, string>,
				);

				// Validasi via Zod (gagal → record di-skip, dicatat untuk Sentry)
				const parseResult = ADMSRecordSchema.safeParse(raw);
				if (!parseResult.success) {
					errors.push(`Invalid record: ${line} — ${parseResult.error.message}`);
					continue;
				}

				const record = parseResult.data;

				// Resolve employee by biometricId atau employeeCode
				const employeeResult = await this.db
					.select()
					.from(schema.employees)
					.where(
						or(
							eq(schema.employees.biometricId, record.USERID),
							eq(schema.employees.employeeCode, record.USERID),
						),
					);

				if (employeeResult.length === 0) {
					errors.push(`Employee not found for USERID=${record.USERID}`);
					continue;
				}

				const employee = employeeResult[0];

				// Fix timezone: mesin kirim waktu lokal (WIB), parse sebagai lokal
				const timestamp = new Date(record.CHECKTIME);
				const type = record.CHECKTYPE === "0" ? "IN" : "OUT";

				// Dedup: cek apakah log dengan employee+timestamp+type sudah ada
				const existing = await this.db
					.select({ id: schema.attendanceLogs.id })
					.from(schema.attendanceLogs)
					.where(
						and(
							eq(schema.attendanceLogs.employeeId, employee.id),
							eq(schema.attendanceLogs.timestamp, timestamp),
							eq(schema.attendanceLogs.type, type as "IN" | "OUT"),
						),
					);

				if (existing.length > 0) {
					continue; // Skip duplikat
				}

				// Hitung status (LATE/PRESENT) berdasarkan shift
				const status = await this.shiftEngine.evaluateAttendance({
					employeeId: employee.id,
					shiftId: employee.shiftId,
					timestamp,
					type,
				});

				const log = {
					employeeId: employee.id,
					deviceId,
					timestamp,
					type: type as "IN" | "OUT",
					status,
				};

				await this.admsQueue.add("process-log", { sn, log });
				queued += 1;
			} catch (error) {
				const message = (error as Error).message;
				errors.push(`Exception parsing "${line}": ${message}`);
				this.logger.error(
					`Error parsing ADMS line: ${line}`,
					(error as Error).stack,
				);
			}
		}

		this.logger.log(
			`Device ${sn}: queued ${queued} logs, ${errors.length} errors`,
		);
		if (errors.length > 0) {
			this.logger.warn(
				`ADMS parser warnings (${sn}):\n${errors.slice(0, 10).join("\n")}`,
			);
		}
		return `OK: ${queued}`;
	}

	/**
	 * Menerima data user/pegawai dari mesin ADMS.
	 * Format: PIN=1\tName=John Doe\tPri=0\tPasswd=\tCard=\tGrp=1
	 * Auto-create employee jika belum ada (by biometricId/PIN).
	 */
	async handleUserData(sn: string, rawData: string) {
		const lines = rawData.split("\n").filter((line) => line.trim());
		let synced = 0;

		for (const line of lines) {
			try {
				const fields = line.split("\t").reduce(
					(acc, part) => {
						const idx = part.indexOf("=");
						if (idx > 0) {
							acc[part.substring(0, idx)] = part.substring(idx + 1);
						}
						return acc;
					},
					{} as Record<string, string>,
				);

				const pin = fields.PIN || fields.UserId;
				const name = fields.Name || fields.name;
				if (!pin) continue;

				// Cek apakah employee dengan biometricId ini sudah ada
				const existing = await this.db
					.select()
					.from(schema.employees)
					.where(
						or(
							eq(schema.employees.biometricId, pin),
							eq(schema.employees.employeeCode, pin),
						),
					);

				if (existing.length === 0 && name) {
					// Auto-create employee dari data mesin
					await this.db.insert(schema.employees).values({
						employeeCode: pin,
						name: name,
						biometricId: pin,
						biometricSyncedAt: new Date(),
						isActive: true,
					});
					synced++;
					this.logger.log(`Auto-created employee from device: PIN=${pin}, Name=${name}`);
				} else if (existing.length > 0) {
					// Update biometric sync timestamp
					await this.db
						.update(schema.employees)
						.set({ biometricSyncedAt: new Date(), updatedAt: new Date() })
						.where(eq(schema.employees.id, existing[0].id));
				}
			} catch (error) {
				this.logger.warn(`Failed to sync user from device ${sn}: ${(error as Error).message}`);
			}
		}

		this.logger.log(`Device ${sn}: synced ${synced} users`);
		return `OK: ${synced}`;
	}

	/**
	 * Menerima dan menyimpan foto capture absensi dari mesin.
	 * Foto disimpan ke folder uploads/ dan URL-nya di-update ke attendance_log terakhir.
	 */
	async handlePhotoUpload(sn: string, pin: string, fileName: string, photoData: Buffer) {
		try {
			const fs = await import("node:fs");
			const path = await import("node:path");

			const dir = path.join(process.cwd(), "uploads", sn, pin);
			fs.mkdirSync(dir, { recursive: true });

			const finalName = fileName || `${Date.now()}.jpg`;
			fs.writeFileSync(path.join(dir, finalName), photoData);

			const photoUrl = `/uploads/${sn}/${pin}/${finalName}`;

			// Update attendance log terakhir milik employee ini dengan photoUrl
			const employee = await this.db
				.select()
				.from(schema.employees)
				.where(
					or(
						eq(schema.employees.biometricId, pin),
						eq(schema.employees.employeeCode, pin),
					),
				);

			if (employee.length > 0) {
				await this.db.execute(
					sql`UPDATE attendance_logs SET photo_url = ${photoUrl}
					WHERE employee_id = ${employee[0].id}
					AND photo_url IS NULL
					ORDER BY timestamp DESC LIMIT 1`,
				);
			}

			this.logger.log(`Photo saved: ${photoUrl}`);
		} catch (error) {
			this.logger.error(`Failed to save photo: ${(error as Error).message}`);
		}
	}

	/**
	 * Sinkronisasi status online perangkat (heartbeat).
	 */
	async updateDeviceStatus(sn: string, ip: string) {
		await this.db
			.update(schema.devices)
			.set({
				isOnline: true,
				lastSeen: new Date(),
				ipAddress: ip,
				updatedAt: new Date(),
			})
			.where(eq(schema.devices.serialNumber, sn));
	}

	/**
	 * Auto-register device jika belum ada, atau update status jika sudah ada.
	 */
	async registerOrUpdateDevice(sn: string, ip: string) {
		const existing = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.serialNumber, sn));

		if (existing.length === 0) {
			const [device] = await this.db.insert(schema.devices).values({
				serialNumber: sn,
				name: `Device ${sn}`,
				ipAddress: ip,
				isOnline: true,
				lastSeen: new Date(),
			}).returning();
			this.logger.log(`Auto-registered new device: ${sn}`);
			return device;
		}

		await this.updateDeviceStatus(sn, ip);
		return existing[0];
	}

	/**
	 * Konfirmasi perintah selesai dieksekusi mesin.
	 */
	async ackCommand(commandId: number, success: boolean) {
		await this.db
			.update(schema.deviceCommands)
			.set({
				status: success ? "COMPLETED" : "ERROR",
				updatedAt: new Date(),
			})
			.where(eq(schema.deviceCommands.id, commandId));
	}
}
