import {
	type CreateDevice,
	CreateDeviceSchema,
	type SendCommand,
	SendCommandSchema,
	type UpdateDevice,
	UpdateDeviceSchema,
} from "@adms/shared-types";
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Req,
	UseGuards,
	UsePipes,
} from "@nestjs/common";
import type { Request } from "express";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DevicesService } from "./devices.service";

@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
	constructor(
		private readonly devicesService: DevicesService,
		private readonly auditLogsService: AuditLogsService,
	) {}

	@Get()
	findAll() {
		return this.devicesService.findAll();
	}

	@Get(":id")
	findOne(@Param("id", ParseIntPipe) id: number) {
		return this.devicesService.findOne(id);
	}

	@Post()
	@UsePipes(new ZodValidationPipe(CreateDeviceSchema))
	async create(@Body() createDeviceDto: CreateDevice, @Req() req: Request) {
		const result = await this.devicesService.create(createDeviceDto);
		const user = req.user as { id: number };

		void this.auditLogsService.record({
			userId: user.id,
			action: "CREATE",
			target: "devices",
			details: { new: result },
		});

		return result;
	}

	@Patch(":id")
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body(new ZodValidationPipe(UpdateDeviceSchema))
		updateDeviceDto: UpdateDevice,
		@Req() req: Request,
	) {
		const result = await this.devicesService.update(id, updateDeviceDto);
		const user = req.user as { id: number };

		void this.auditLogsService.record({
			userId: user.id,
			action: "UPDATE",
			target: "devices",
			details: { id, update: updateDeviceDto, result },
		});

		return result;
	}

	@Delete(":id")
	async remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
		const result = await this.devicesService.remove(id);
		const user = req.user as { id: number };

		void this.auditLogsService.record({
			userId: user.id,
			action: "DELETE",
			target: "devices",
			details: { id },
		});

		return result;
	}

	@Get(":id/commands")
	getCommands(@Param("id", ParseIntPipe) id: number) {
		return this.devicesService.getCommands(id);
	}

	@Post("command")
	async sendCommand(
		@Body(new ZodValidationPipe(SendCommandSchema)) dto: SendCommand,
		@Req() req: Request,
	) {
		const result = await this.devicesService.sendCommand(dto);
		const user = req.user as { id: number };

		void this.auditLogsService.record({
			userId: user.id,
			action: "COMMAND",
			target: "devices",
			details: { deviceId: dto.deviceId, type: dto.type },
		});

		return result;
	}
}
