import { Module } from "@nestjs/common";
import { AttendanceLogsController } from "./attendance-logs.controller";
import { AttendanceLogsService } from "./attendance-logs.service";

@Module({
	controllers: [AttendanceLogsController],
	providers: [AttendanceLogsService],
})
export class AttendanceLogsModule {}
