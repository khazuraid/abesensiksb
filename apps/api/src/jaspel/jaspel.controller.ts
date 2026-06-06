import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CalculateJaspelDto, UpdateVariableDto } from "./dto/jaspel.dto";
import { JaspelService } from "./jaspel.service";

@Controller("jaspel")
export class JaspelController {
	constructor(private readonly jaspelService: JaspelService) {}

	@Get("variables")
	async getVariables() {
		return this.jaspelService.getVariables();
	}

	@Put("variables/:employeeId")
	async updateVariable(
		@Param("employeeId") employeeId: string,
		@Body() dto: UpdateVariableDto,
	) {
		return this.jaspelService.updateVariable(
			Number(employeeId),
			dto.basicIndex,
			dto.positionIndex,
			dto.riskIndex,
		);
	}

	@Get("distributions")
	async getDistributions(
		@Query("month") month: string,
		@Query("year") year: string,
	) {
		const m = month ? Number(month) : new Date().getMonth() + 1;
		const y = year ? Number(year) : new Date().getFullYear();
		return this.jaspelService.getDistributions(m, y);
	}

	@Post("calculate")
	async calculate(@Body() dto: CalculateJaspelDto) {
		return this.jaspelService.calculate(dto.month, dto.year, dto.totalFund);
	}
}
