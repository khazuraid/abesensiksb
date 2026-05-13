import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class UsersService {
	constructor(
		@Inject(DRIZZLE)
		private db: NodePgDatabase<typeof schema>,
	) {}

	async findAll() {
		return this.db
			.select({
				id: schema.users.id,
				email: schema.users.email,
				name: schema.users.name,
				role: schema.users.role,
				createdAt: schema.users.createdAt,
			})
			.from(schema.users);
	}

	async findOne(id: number) {
		const result = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, id));
		return result[0] || null;
	}

	async findByEmail(email: string) {
		const result = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, email));
		return result[0] || null;
	}

	async update(id: number, data: { name?: string; email?: string }) {
		const [result] = await this.db
			.update(schema.users)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.users.id, id))
			.returning({
				id: schema.users.id,
				email: schema.users.email,
				name: schema.users.name,
				role: schema.users.role,
			});
		return result;
	}

	async updatePassword(id: number, hashedPassword: string) {
		await this.db
			.update(schema.users)
			.set({ password: hashedPassword, updatedAt: new Date() })
			.where(eq(schema.users.id, id));
	}
}
