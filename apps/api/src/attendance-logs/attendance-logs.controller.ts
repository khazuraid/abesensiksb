import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AttendanceLogsService } from "./attendance-logs.service";

@Controller("attendance-logs")
@UseGuards(JwtAuthGuard)
export class AttendanceLogsController {
	constructor(private readonly attendanceLogsService: AttendanceLogsService) {}

	@Get("stats")
	getStats() {
		return this.attendanceLogsService.getStats();
	}

	@Get()
	findAll(
		@Query("from") from?: string,
		@Query("to") to?: string,
		@Query("status") status?: string,
		@Query("deviceId") deviceId?: string,
		@Query("limit") limit?: string,
	) {
		return this.attendanceLogsService.findAll({
			from: from ? new Date(from) : undefined,
			to: to ? new Date(to) : undefined,
			status,
			deviceId: deviceId ? Number.parseInt(deviceId, 10) : undefined,
			limit: limit ? Number.parseInt(limit, 10) : undefined,
		});
	}
}
