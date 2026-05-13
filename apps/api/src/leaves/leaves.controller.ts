import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LeavesService } from "./leaves.service";

@Controller("leaves")
@UseGuards(JwtAuthGuard)
export class LeavesController {
	constructor(private readonly leavesService: LeavesService) {}

	@Get()
	findAll(@Query("employeeId") employeeId?: string) {
		return this.leavesService.findAll(
			employeeId ? Number.parseInt(employeeId, 10) : undefined,
		);
	}

	@Post()
	create(
		@Body()
		body: {
			employeeId: number;
			type: "ANNUAL" | "SICK" | "PERMISSION" | "MATERNITY" | "OTHER";
			startDate: string;
			endDate: string;
			reason?: string;
		},
	) {
		return this.leavesService.create(body);
	}

	@Patch(":id/approve")
	approve(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
		const user = req.user as { userId: number };
		return this.leavesService.approve(id, user.userId);
	}

	@Patch(":id/reject")
	reject(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
		const user = req.user as { userId: number };
		return this.leavesService.reject(id, user.userId);
	}

	@Delete(":id")
	remove(@Param("id", ParseIntPipe) id: number) {
		return this.leavesService.remove(id);
	}
}
