import * as schema from "@adms/database";
import type { CreateDevice, UpdateDevice } from "@adms/shared-types";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class DevicesService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async findAll() {
		return await this.db.select().from(schema.devices);
	}

	async findOne(id: number) {
		const result = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.id, id));

		if (result.length === 0) {
			throw new NotFoundException(`Device with ID ${id} not found`);
		}

		return result[0];
	}

	async create(data: CreateDevice) {
		const result = await this.db
			.insert(schema.devices)
			.values(data)
			.returning();
		return result[0];
	}

	async update(id: number, data: UpdateDevice) {
		const result = await this.db
			.update(schema.devices)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.devices.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Device with ID ${id} not found`);
		}

		return result[0];
	}

	async remove(id: number) {
		const result = await this.db
			.delete(schema.devices)
			.where(eq(schema.devices.id, id))
			.returning();

		if (result.length === 0) {
			throw new NotFoundException(`Device with ID ${id} not found`);
		}

		return { message: "Device deleted successfully" };
	}

	async sendCommand(deviceId: number, command: string) {
		await this.findOne(deviceId); // throws if not found
		const result = await this.db
			.insert(schema.deviceCommands)
			.values({ deviceId, command })
			.returning();
		return result[0];
	}
}
