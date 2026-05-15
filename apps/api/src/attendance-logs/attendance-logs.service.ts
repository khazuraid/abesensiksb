import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

export interface AttendanceLogFilter {
	from?: Date;
	to?: Date;
	status?: string;
	deviceId?: number;
	limit?: number;
}

@Injectable()
export class AttendanceLogsService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll(filter: AttendanceLogFilter = {}) {
		const conditions: SQL[] = [];

		if (filter.from) {
			conditions.push(gte(schema.attendanceLogs.timestamp, filter.from));
		}
		if (filter.to) {
			conditions.push(lte(schema.attendanceLogs.timestamp, filter.to));
		}
		if (
			filter.status &&
			["PRESENT", "LATE", "ABSENT"].includes(filter.status)
		) {
			conditions.push(
				eq(
					schema.attendanceLogs.status,
					filter.status as "PRESENT" | "LATE" | "ABSENT",
				),
			);
		}
		if (filter.deviceId) {
			conditions.push(eq(schema.attendanceLogs.deviceId, filter.deviceId));
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const query = this.db
			.select({
				id: schema.attendanceLogs.id,
				timestamp: schema.attendanceLogs.timestamp,
				type: schema.attendanceLogs.type,
				status: schema.attendanceLogs.status,
				photoUrl: schema.attendanceLogs.photoUrl,
				employee: {
					name: schema.employees.name,
					employeeCode: schema.employees.employeeCode,
				},
				device: {
					name: schema.devices.name,
					serialNumber: schema.devices.serialNumber,
				},
			})
			.from(schema.attendanceLogs)
			.leftJoin(
				schema.employees,
				eq(schema.attendanceLogs.employeeId, schema.employees.id),
			)
			.leftJoin(
				schema.devices,
				eq(schema.attendanceLogs.deviceId, schema.devices.id),
			)
			.where(where)
			.orderBy(desc(schema.attendanceLogs.timestamp));

		if (filter.limit) {
			return await query.limit(filter.limit);
		}
		return await query;
	}

	async updateTimestamp(id: number, timestamp: Date) {
		const result = await this.db
			.update(schema.attendanceLogs)
			.set({ timestamp })
			.where(eq(schema.attendanceLogs.id, id))
			.returning();
		return result[0];
	}

	async getStats() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const [totalEmployees] = await this.db
			.select({ count: count() })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));

		const [presentToday] = await this.db
			.select({ count: count() })
			.from(schema.attendanceLogs)
			.where(
				and(
					gte(schema.attendanceLogs.timestamp, today),
					lte(schema.attendanceLogs.timestamp, tomorrow),
					eq(schema.attendanceLogs.type, "IN"),
				),
			);

		const [lateToday] = await this.db
			.select({ count: count() })
			.from(schema.attendanceLogs)
			.where(
				and(
					gte(schema.attendanceLogs.timestamp, today),
					lte(schema.attendanceLogs.timestamp, tomorrow),
					eq(schema.attendanceLogs.type, "IN"),
					eq(schema.attendanceLogs.status, "LATE"),
				),
			);

		const devicesResult = await this.db.select().from(schema.devices);
		const devicesOnline = devicesResult.filter((d) => d.isOnline).length;

		return {
			totalEmployees: totalEmployees?.count ?? 0,
			presentToday: presentToday?.count ?? 0,
			lateToday: lateToday?.count ?? 0,
			devicesOnline,
			devicesTotal: devicesResult.length,
		};
	}
}
