import {
	Controller,
	Get,
	ParseIntPipe,
	Query,
	Res,
	UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get("summary")
	getSummary(
		@Query("month", ParseIntPipe) month: number,
		@Query("year", ParseIntPipe) year: number,
	) {
		return this.reportsService.getMonthlySummary(month, year);
	}

	@Get("available-periods")
	getAvailablePeriods() {
		return this.reportsService.getAvailablePeriods();
	}

	@Get("daily-recap")
	getDailyRecap(
		@Query("month", ParseIntPipe) month: number,
		@Query("year", ParseIntPipe) year: number,
	) {
		return this.reportsService.getDailyRecap(month, year);
	}

	@Get("daily-recap/export")
	async exportDailyRecap(
		@Query("month", ParseIntPipe) month: number,
		@Query("year", ParseIntPipe) year: number,
		@Res() res: Response,
	) {
		const workbook = await this.reportsService.generateDailyRecapExcel(
			month,
			year,
		);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=Rekap-Harian-${month}-${year}.xlsx`,
		);
		return workbook.xlsx.write(res).then(() => res.status(200).end());
	}

	@Get("export")
	async export(
		@Query("month", ParseIntPipe) month: number,
		@Query("year", ParseIntPipe) year: number,
		@Res() res: Response,
	) {
		const workbook = await this.reportsService.generateExcel(month, year);
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=Laporan-Absensi-${month}-${year}.xlsx`,
		);

		return workbook.xlsx.write(res).then(() => {
			res.status(200).end();
		});
	}
}
