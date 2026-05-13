import {
	type CreateShift,
	CreateShiftSchema,
	type UpdateShift,
	UpdateShiftSchema,
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
import { ShiftsService } from "./shifts.service";

@Controller("shifts")
@UseGuards(JwtAuthGuard)
export class ShiftsController {
	constructor(
		private readonly shiftsService: ShiftsService,
		private readonly auditLogsService: AuditLogsService,
	) {}

	@Get()
	findAll() {
		return this.shiftsService.findAll();
	}

	@Get(":id")
	findOne(@Param("id", ParseIntPipe) id: number) {
		return this.shiftsService.findOne(id);
	}

	@Post()
	@UsePipes(new ZodValidationPipe(CreateShiftSchema))
	async create(@Body() createShiftDto: CreateShift, @Req() req: Request) {
		const result = await this.shiftsService.create(createShiftDto);
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "CREATE",
			target: "shifts",
			details: { new: result },
		});

		return result;
	}

	@Patch(":id")
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body(new ZodValidationPipe(UpdateShiftSchema))
		updateShiftDto: UpdateShift,
		@Req() req: Request,
	) {
		const result = await this.shiftsService.update(id, updateShiftDto);
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "UPDATE",
			target: "shifts",
			details: { id, update: updateShiftDto, result },
		});

		return result;
	}

	@Delete(":id")
	async remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
		const result = await this.shiftsService.remove(id);
		const user = req.user as { id: number };

		this.auditLogsService.record({
			userId: user.id,
			action: "DELETE",
			target: "shifts",
			details: { id },
		});

		return result;
	}
}
