import * as schema from "@adms/database";
import type { CreateDevice, SendCommand, UpdateDevice } from "@adms/shared-types";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class DevicesService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll() {
		return await this.db.select().from(schema.devices);
	}

	async findOne(id: number) {
		const result = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.id, id));

		if (result.length === 0) {
			throw new NotFoundException(`Device with ID ${id} not found`);
		}

		return result[0];
	}

	async create(data: CreateDevice) {
		const result = await this.db
			.insert(schema.devices)
			.values(data)
			.returning();
		return result[0];
	}

	async update(id: number, data: UpdateDevice) {
		const result = await this.db
			.update(schema.devices)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.devices.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Device with ID ${id} not found`);
		}

		return result[0];
	}

	async remove(id: number) {
		const result = await this.db
			.delete(schema.devices)
			.where(eq(schema.devices.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Device with ID ${id} not found`);
		}

		return { message: "Device deleted successfully" };
	}

	async getCommands(deviceId: number) {
		return this.db
			.select()
			.from(schema.deviceCommands)
			.where(eq(schema.deviceCommands.deviceId, deviceId))
			.orderBy(desc(schema.deviceCommands.createdAt))
			.limit(50);
	}

	async sendCommand(dto: SendCommand) {
		const device = await this.findOne(dto.deviceId);
		const commands: string[] = [];
		const results: (typeof schema.deviceCommands.$inferSelect)[] = [];

		switch (dto.type) {
			case "check":
				commands.push("CHECK");
				break;

			case "reset":
				commands.push("CHECK");
				break;

			case "info":
				commands.push("INFO");
				break;

			case "log":
				commands.push("LOG");
				break;

			case "reboot":
				commands.push("REBOOT");
				break;

			case "reload":
				commands.push("RELOAD OPTIONS");
				break;

			case "set.timezone": {
				const tz = dto.timezone ?? 7;
				commands.push(`SET OPTION DtFmt=${tz}`);
				commands.push("REBOOT");
				break;
			}

			case "set.time": {
				const now = new Date();
				const y = now.getFullYear();
				const mo = String(now.getMonth() + 1).padStart(2, "0");
				const d = String(now.getDate()).padStart(2, "0");
				const h = String(now.getHours()).padStart(2, "0");
				const mi = String(now.getMinutes()).padStart(2, "0");
				const s = String(now.getSeconds()).padStart(2, "0");
				commands.push(`SET OPTION DateTime=${y}-${mo}-${d} ${h}:${mi}:${s}`);
				break;
			}

			case "camera.enable": {
				commands.push("SET OPTION CapturePhoto=1");
				commands.push("SET OPTION PhotoStamp=1");
				break;
			}

			case "camera.disable": {
				commands.push("SET OPTION CapturePhoto=0");
				break;
			}

			case "set.volume": {
				const vol = dto.volume ?? 50;
				commands.push(`SET OPTION VOLUME=${vol}`);
				break;
			}

			case "set.language":
				commands.push(`SET OPTION Language=${dto.language ?? "83"}`);
				break;

			case "user.info": {
				if (!dto.user_id) throw new BadRequestException("user_id is required");
				commands.push(`DATA QUERY USERINFO PIN=${dto.user_id}`);
				commands.push(`DATA QUERY FINGERTMP PIN=${dto.user_id}`);
				break;
			}

			case "user.sync": {
				commands.push("DATA QUERY USERINFO");
				break;
			}

			case "user.edit": {
				if (!dto.user_id) throw new BadRequestException("user_id is required");
				const parts = [`PIN=${dto.user_id}`];
				if (dto.name) parts.push(`Name=${dto.name}`);
				if (dto.privilege !== undefined) parts.push(`Pri=${dto.privilege}`);
				if (dto.password !== undefined) parts.push(`Passwd=${dto.password}`);
				commands.push(`DATA UPDATE USERINFO ${parts.join("\t")}`);
				break;
			}

			case "user.delete": {
				if (!dto.user_id) throw new BadRequestException("user_id is required");
				commands.push(`DATA DELETE USERINFO PIN=${dto.user_id}`);
				commands.push(`DATA DELETE FINGERTMP PIN=${dto.user_id}`);
				break;
			}

			case "user.clone": {
				if (!dto.user_id) throw new BadRequestException("user_id is required");
				if (!dto.device_target?.length) throw new BadRequestException("device_target is required");

				// Get user info from source employee
				const employee = await this.db.select().from(schema.employees).where(
					or(
						eq(schema.employees.biometricId, dto.user_id),
						eq(schema.employees.employeeCode, dto.user_id),
					),
				);

				// Get fingerprint templates from source device
				const templates = await this.db.select().from(schema.fingerprintTemplates).where(
					and(
						eq(schema.fingerprintTemplates.deviceId, dto.deviceId),
						eq(schema.fingerprintTemplates.userId, dto.user_id),
					),
				);

				const userName = employee[0]?.name || dto.user_id;
				const userPayload = `PIN=${dto.user_id}\tName=${userName}\tPri=0\tPasswd=\tCard=\tGrp=`;

				// Push user + templates to each target device
				for (const targetId of dto.device_target) {
					if (targetId === dto.deviceId) continue;

					// Push user info
					const userCmd = await this.db.insert(schema.deviceCommands)
						.values({ deviceId: targetId, command: `DATA UPDATE USERINFO ${userPayload}` })
						.returning();
					results.push(userCmd[0]!);

					// Push each fingerprint template
					for (const t of templates) {
						if (!t.template) continue;
						const fpPayload = `PIN=${t.userId}\tFID=${t.fid}\tSize=${t.size || 0}\tValid=${t.valid ? 1 : 0}\tTMP=${t.template}`;
						const fpCmd = await this.db.insert(schema.deviceCommands)
							.values({ deviceId: targetId, command: `DATA UPDATE FINGERTMP ${fpPayload}` })
							.returning();
						results.push(fpCmd[0]!);
					}
				}

				return results;
			}

			case "attendance.download": {
				if (!dto.start_date || !dto.end_date)
					throw new BadRequestException("start_date and end_date required");
				commands.push(
					`DATA QUERY ATTLOG StartTime=${dto.start_date} 00:00:00\tEndTime=${dto.end_date} 23:59:59`,
				);
				break;
			}

			case "attendance.verify": {
				if (!dto.start_date || !dto.end_date)
					throw new BadRequestException("start_date and end_date required");
				commands.push(
					`VERIFY SUM ATTLOG StartTime=${dto.start_date} 00:00:00\tEndTime=${dto.end_date} 23:59:59`,
				);
				break;
			}

			case "attendance.clear":
				commands.push("CLEAR LOG");
				break;

			case "command.system": {
				if (!dto.command) throw new BadRequestException("command is required");
				commands.push(`SHELL ${dto.command}`);
				break;
			}

			default:
				throw new BadRequestException(`Unsupported command type: ${dto.type}`);
		}

		for (const cmd of commands) {
			const result = await this.db
				.insert(schema.deviceCommands)
				.values({ deviceId: dto.deviceId, command: cmd })
				.returning();
			results.push(result[0]!);
		}

		return results;
	}
}
