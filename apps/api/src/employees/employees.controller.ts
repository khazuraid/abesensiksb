import {
	type CreateEmployee,
	CreateEmployeeSchema,
	type UpdateEmployee,
	UpdateEmployeeSchema,
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
import { DevicesService } from "../devices/devices.service";
import { EmployeesService } from "./employees.service";

@Controller("employees")
@UseGuards(JwtAuthGuard)
export class EmployeesController {
	constructor(
		private readonly employeesService: EmployeesService,
		private readonly auditLogsService: AuditLogsService,
		private readonly devicesService: DevicesService,
	) {}

	@Get()
	findAll() {
		return this.employeesService.findAll();
	}

	@Get(":id")
	findOne(@Param("id", ParseIntPipe) id: number) {
		return this.employeesService.findOne(id);
	}

	@Post()
	@UsePipes(new ZodValidationPipe(CreateEmployeeSchema))
	async create(@Body() createEmployeeDto: CreateEmployee, @Req() req: Request) {
		const result = await this.employeesService.create(createEmployeeDto);
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "CREATE",
			target: "employees",
			details: { new: result },
		});

		return result;
	}

	@Patch(":id")
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body(new ZodValidationPipe(UpdateEmployeeSchema))
		updateEmployeeDto: UpdateEmployee,
		@Req() req: Request,
	) {
		const result = await this.employeesService.update(id, updateEmployeeDto);
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "UPDATE",
			target: "employees",
			details: { id, update: updateEmployeeDto, result },
		});

		return result;
	}

	@Delete(":id")
	async remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
		const result = await this.employeesService.remove(id);
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "DELETE",
			target: "employees",
			details: { id },
		});

		return result;
	}

	/**
	 * Kirim perintah ke mesin untuk upload data user.
	 * Mesin akan push data user ke POST /iclock/cdata?table=user
	 */
	@Post("sync-device")
	async syncFromDevice(
		@Body() body: { deviceId: number },
		@Req() req: Request,
	) {
		await this.devicesService.sendCommand({ deviceId: body.deviceId, type: "user.sync" });
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "SYNC",
			target: "employees",
			details: { deviceId: body.deviceId },
		});

		return { message: "Perintah sync user dikirim ke mesin. Data akan masuk otomatis." };
	}
}
