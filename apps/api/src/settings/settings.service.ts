import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class SettingsService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async getAll() {
		return await this.db.select().from(schema.settings);
	}

	async get(key: string): Promise<string | null> {
		const result = await this.db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, key));
		return result[0]?.value ?? null;
	}

	async set(key: string, value: string) {
		const existing = await this.db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, key));

		if (existing.length > 0) {
			await this.db
				.update(schema.settings)
				.set({ value, updatedAt: new Date() })
				.where(eq(schema.settings.key, key));
		} else {
			await this.db.insert(schema.settings).values({ key, value });
		}

		return { key, value };
	}

	async setBulk(data: Record<string, string>) {
		for (const [key, value] of Object.entries(data)) {
			await this.set(key, value);
		}
		return { message: "Settings updated" };
	}
}
