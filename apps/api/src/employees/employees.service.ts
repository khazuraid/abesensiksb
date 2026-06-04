import * as schema from "@adms/database";
import type { CreateEmployee, UpdateEmployee } from "@adms/shared-types";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class EmployeesService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll() {
		return await this.db.select().from(schema.employees);
	}

	async findOne(id: number) {
		const result = await this.db
			.select()
			.from(schema.employees)
			.where(eq(schema.employees.id, id));

		if (result.length === 0) {
			throw new NotFoundException(`Employee with ID ${id} not found`);
		}

		return result[0];
	}

	async create(data: CreateEmployee) {
		const result = await this.db
			.insert(schema.employees)
			.values(data)
			.returning();
		return result[0];
	}

	async bulkCreate(data: CreateEmployee[]) {
		if (data.length === 0) return [];
		const result = await this.db
			.insert(schema.employees)
			.values(data)
			.returning();
		return result;
	}

	async update(id: number, data: UpdateEmployee) {
		const result = await this.db
			.update(schema.employees)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.employees.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Employee with ID ${id} not found`);
		}

		return result[0];
	}

	async remove(id: number) {
		const result = await this.db
			.delete(schema.employees)
			.where(eq(schema.employees.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Employee with ID ${id} not found`);
		}

		return { message: "Employee deleted successfully" };
	}

	async bulkAssignShift(employeeIds: number[], shiftId: number) {
		await this.db
			.update(schema.employees)
			.set({ shiftId, updatedAt: new Date() })
			.where(inArray(schema.employees.id, employeeIds));
		return { message: `Shift assigned to ${employeeIds.length} employees` };
	}
}
