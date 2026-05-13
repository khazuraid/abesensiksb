import * as schema from "@adms/database";
import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { DRIZZLE } from "./database/database.module";

@Controller()
export class AppController {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	@Get()
	getHello() {
		return { message: "API ADMS berjalan" };
	}

	@Get("health-db")
	@UseGuards(JwtAuthGuard)
	async healthDb() {
		const result = await this.db.execute(sql`SELECT 1 as ok`);
		return { status: "ok", connected: result.rows.length > 0 };
	}
}
