import * as schema from "@adms/database";
import type { CreateHoliday, UpdateHoliday } from "@adms/shared-types";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

interface ExternalHoliday {
	date: string;
	name: string;
	is_national_holiday: boolean;
}

export interface HolidayFilter {
	page?: number;
	limit?: number;
	search?: string;
}

@Injectable()
export class HolidaysService {
	private readonly logger = new Logger(HolidaysService.name);

	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll(filter: HolidayFilter = {}) {
		const conditions: SQL[] = [];

		if (filter.search) {
			const searchPattern = `%${filter.search}%`;
			conditions.push(ilike(schema.holidays.name, searchPattern));
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const query = this.db
			.select()
			.from(schema.holidays)
			.where(where)
			.orderBy(asc(schema.holidays.date));

		if (filter.page) {
			const limit = filter.limit || 50;
			const offset = (filter.page - 1) * limit;

			const [totalCountResult] = await this.db
				.select({ count: count() })
				.from(schema.holidays)
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

	async create(data: CreateHoliday) {
		const result = await this.db
			.insert(schema.holidays)
			.values(data)
			.returning();
		return result[0];
	}

	async update(id: number, data: UpdateHoliday) {
		const result = await this.db
			.update(schema.holidays)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.holidays.id, id))
			.returning();
		if (result.length === 0) {
			throw new NotFoundException(`Holiday with ID ${id} not found`);
		}
		return result[0];
	}

	async remove(id: number) {
		const result = await this.db
			.delete(schema.holidays)
			.where(eq(schema.holidays.id, id))
			.returning();
		if (result.length === 0) {
			throw new NotFoundException(`Holiday with ID ${id} not found`);
		}
		return { message: "Holiday deleted successfully" };
	}

	/**
	 * Sync hari libur nasional dari API luar (libur.deno.dev)
	 * ke database lokal. Hanya insert yang belum ada (by date).
	 */
	async syncFromExternal(year?: number): Promise<{ synced: number }> {
		const targetYear = year || new Date().getFullYear();

		const result = await this.db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, "HOLIDAY_API_URL"));

		let url = result[0]?.value;
		if (!url) {
			url = `https://libur.deno.dev/api?year=${targetYear}`;
		} else {
			url = url.replace("{year}", targetYear.toString());
			if (!url.includes("year=") && !url.includes("{year}")) {
				url = url.includes("?")
					? `${url}&year=${targetYear}`
					: `${url}?year=${targetYear}`;
			}
		}

		this.logger.log(`Syncing holidays from ${url}`);

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch holidays: ${response.statusText}`);
		}

		const data = (await response.json()) as ExternalHoliday[];
		let synced = 0;

		for (const item of data) {
			if (!item.is_national_holiday) continue;

			try {
				await this.db
					.insert(schema.holidays)
					.values({
						date: item.date,
						name: item.name,
						description: "Hari Libur Nasional (sync otomatis)",
					})
					.onConflictDoNothing({ target: schema.holidays.date });
				synced++;
			} catch {
				// skip duplicate
			}
		}

		this.logger.log(`Synced ${synced} holidays for year ${targetYear}`);
		return { synced };
	}
}
