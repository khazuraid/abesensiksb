import {
	type CreateHoliday,
	CreateHolidaySchema,
	type UpdateHoliday,
	UpdateHolidaySchema,
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
	Query,
	UseGuards,
	UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { HolidaysService } from "./holidays.service";

@Controller("holidays")
@UseGuards(JwtAuthGuard)
export class HolidaysController {
	constructor(private readonly holidaysService: HolidaysService) {}

	@Get()
	findAll(
		@Query("limit") limit?: string,
		@Query("page") page?: string,
		@Query("search") search?: string,
	) {
		return this.holidaysService.findAll({
			limit: limit ? Number.parseInt(limit, 10) : undefined,
			page: page ? Number.parseInt(page, 10) : undefined,
			search,
		});
	}

	@Post("sync")
	sync(@Query("year") year?: string) {
		return this.holidaysService.syncFromExternal(
			year ? Number.parseInt(year, 10) : undefined,
		);
	}

	@Post()
	@UsePipes(new ZodValidationPipe(CreateHolidaySchema))
	create(@Body() data: CreateHoliday) {
		return this.holidaysService.create(data);
	}

	@Patch(":id")
	update(
		@Param("id", ParseIntPipe) id: number,
		@Body(new ZodValidationPipe(UpdateHolidaySchema)) data: UpdateHoliday,
	) {
		return this.holidaysService.update(id, data);
	}

	@Delete(":id")
	remove(@Param("id", ParseIntPipe) id: number) {
		return this.holidaysService.remove(id);
	}
}
