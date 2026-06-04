import * as schema from "@adms/database";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class LeavesService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll(employeeId?: number) {
		const conditions = employeeId
			? eq(schema.leaves.employeeId, employeeId)
			: undefined;

		return await this.db
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
			.where(conditions)
			.orderBy(desc(schema.leaves.createdAt));
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
