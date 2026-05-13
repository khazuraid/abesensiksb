import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class AuditLogsService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async record(data: {
		userId?: number;
		action: string;
		target: string;
		details?: Record<string, unknown>;
	}) {
		try {
			await this.db.insert(schema.auditLogs).values({
				userId: data.userId,
				action: data.action,
				target: data.target,
				details: data.details,
			});
		} catch (error) {
			// Jangan biarkan error audit log menggagalkan proses utama
			console.error("Failed to record audit log:", error);
		}
	}
}
