import * as schema from "@adms/database";
import type { CreateShift, UpdateShift } from "@adms/shared-types";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class ShiftsService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll() {
		return await this.db.select().from(schema.shifts);
	}

	async findOne(id: number) {
		const result = await this.db
			.select()
			.from(schema.shifts)
			.where(eq(schema.shifts.id, id));

		if (result.length === 0) {
			throw new NotFoundException(`Shift with ID ${id} not found`);
		}

		return result[0];
	}

	async create(data: CreateShift) {
		const result = await this.db.insert(schema.shifts).values(data).returning();
		return result[0];
	}

	async update(id: number, data: UpdateShift) {
		const result = await this.db
			.update(schema.shifts)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.shifts.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Shift with ID ${id} not found`);
		}

		return result[0];
	}

	async remove(id: number) {
		const result = await this.db
			.delete(schema.shifts)
			.where(eq(schema.shifts.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Shift with ID ${id} not found`);
		}

		return { message: "Shift deleted successfully" };
	}
}
