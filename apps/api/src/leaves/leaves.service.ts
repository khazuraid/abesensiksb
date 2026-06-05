import * as schema from "@adms/database";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

export interface LeaveFilter {
	employeeId?: number;
	page?: number;
	limit?: number;
	search?: string;
}

@Injectable()
export class LeavesService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll(filter: LeaveFilter = {}) {
		const conditions: SQL[] = [];
		if (filter.employeeId) {
			conditions.push(eq(schema.leaves.employeeId, filter.employeeId));
		}
		if (filter.search) {
			const searchPattern = `%${filter.search}%`;
			const searchOr = or(
				ilike(schema.employees.name, searchPattern),
				ilike(schema.employees.employeeCode, searchPattern),
			);
			if (searchOr) {
				conditions.push(searchOr);
			}
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const query = this.db
			.select({
				id: schema.leaves.id,
				type: schema.leaves.type,
				startDate: schema.leaves.startDate,
				endDate: schema.leaves.endDate,
				reason: schema.leaves.reason,
				status: schema.leaves.status,
				createdAt: schema.leaves.createdAt,
				employee: {
					name: schema.employees.name,
					employeeCode: schema.employees.employeeCode,
				},
			})
			.from(schema.leaves)
			.leftJoin(
				schema.employees,
				eq(schema.leaves.employeeId, schema.employees.id),
			)
			.where(where)
			.orderBy(desc(schema.leaves.createdAt));

		if (filter.page) {
			const limit = filter.limit || 50;
			const offset = (filter.page - 1) * limit;

			const [totalCountResult] = await this.db
				.select({ count: count() })
				.from(schema.leaves)
				.leftJoin(
					schema.employees,
					eq(schema.leaves.employeeId, schema.employees.id),
				)
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

	async create(data: {
		employeeId: number;
		type: "ANNUAL" | "SICK" | "PERMISSION" | "MATERNITY" | "OTHER";
		startDate: string;
		endDate: string;
		reason?: string;
	}) {
		const [result] = await this.db
			.insert(schema.leaves)
			.values(data)
			.returning();
		return result;
	}

	async approve(id: number, userId: number) {
		const [result] = await this.db
			.update(schema.leaves)
			.set({ status: "APPROVED", approvedBy: userId, updatedAt: new Date() })
			.where(and(eq(schema.leaves.id, id), eq(schema.leaves.status, "PENDING")))
			.returning();
		if (!result)
			throw new NotFoundException("Leave not found or already processed");
		return result;
	}

	async reject(id: number, userId: number) {
		const [result] = await this.db
			.update(schema.leaves)
			.set({ status: "REJECTED", approvedBy: userId, updatedAt: new Date() })
			.where(and(eq(schema.leaves.id, id), eq(schema.leaves.status, "PENDING")))
			.returning();
		if (!result)
			throw new NotFoundException("Leave not found or already processed");
		return result;
	}

	async remove(id: number) {
		const [result] = await this.db
			.delete(schema.leaves)
			.where(eq(schema.leaves.id, id))
			.returning();
		if (!result) throw new NotFoundException("Leave not found");
		return { message: "Leave deleted" };
	}
}
