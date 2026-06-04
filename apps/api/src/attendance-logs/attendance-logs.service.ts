import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	lte,
	or,
	type SQL,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

export interface AttendanceLogFilter {
	from?: Date;
	to?: Date;
	status?: string;
	deviceId?: number;
	limit?: number;
	page?: number;
	search?: string;
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
		if (filter.search) {
			const searchPattern = `%${filter.search}%`;
			conditions.push(
				or(
					ilike(schema.employees.name, searchPattern),
					ilike(schema.employees.employeeCode, searchPattern),
				),
			);
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

		if (filter.page) {
			const limit = filter.limit || 50;
			const offset = (filter.page - 1) * limit;

			const [totalCountResult] = await this.db
				.select({ count: count() })
				.from(schema.attendanceLogs)
				.where(where);

			const total = totalCountResult?.count ?? 0;

			const data = await query.limit(limit).offset(offset);

			return {
				data,
				meta: {
					total,
					page: filter.page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			};
		}

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

	async createManualLog(
		employeeId: number,
		timestamp: Date,
		type: "IN" | "OUT",
	) {
		const result = await this.db
			.insert(schema.attendanceLogs)
			.values({
				employeeId,
				timestamp,
				type,
				status: "PRESENT",
				verified: false,
			})
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

		// Generate Weekly Trend (Last 7 Days)
		const weeklyTrend: {
			name: string;
			present: number;
			late: number;
			absent: number;
		}[] = [];
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

		for (let i = 6; i >= 0; i--) {
			const targetDate = new Date();
			targetDate.setDate(targetDate.getDate() - i);
			targetDate.setHours(0, 0, 0, 0);

			const targetTomorrow = new Date(targetDate);
			targetTomorrow.setDate(targetTomorrow.getDate() + 1);

			const [present] = await this.db
				.select({ count: count() })
				.from(schema.attendanceLogs)
				.where(
					and(
						gte(schema.attendanceLogs.timestamp, targetDate),
						lte(schema.attendanceLogs.timestamp, targetTomorrow),
						eq(schema.attendanceLogs.type, "IN"),
						eq(schema.attendanceLogs.status, "PRESENT"),
					),
				);

			const [late] = await this.db
				.select({ count: count() })
				.from(schema.attendanceLogs)
				.where(
					and(
						gte(schema.attendanceLogs.timestamp, targetDate),
						lte(schema.attendanceLogs.timestamp, targetTomorrow),
						eq(schema.attendanceLogs.type, "IN"),
						eq(schema.attendanceLogs.status, "LATE"),
					),
				);

			const [absent] = await this.db
				.select({ count: count() })
				.from(schema.attendanceLogs)
				.where(
					and(
						gte(schema.attendanceLogs.timestamp, targetDate),
						lte(schema.attendanceLogs.timestamp, targetTomorrow),
						eq(schema.attendanceLogs.type, "IN"),
						eq(schema.attendanceLogs.status, "ABSENT"),
					),
				);

			weeklyTrend.push({
				name: days[targetDate.getDay()],
				present: present?.count ?? 0,
				late: late?.count ?? 0,
				absent: absent?.count ?? 0,
			});
		}

		return {
			totalEmployees: totalEmployees?.count ?? 0,
			presentToday: presentToday?.count ?? 0,
			lateToday: lateToday?.count ?? 0,
			devicesOnline,
			devicesTotal: devicesResult.length,
			weeklyTrend,
		};
	}
}
