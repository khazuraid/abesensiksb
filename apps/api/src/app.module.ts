import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ADMSModule } from "./adms/adms.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AttendanceLogsModule } from "./attendance-logs/attendance-logs.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { DevicesModule } from "./devices/devices.module";
import { EmployeesModule } from "./employees/employees.module";
import { LeavesModule } from "./leaves/leaves.module";
import { ReportsModule } from "./reports/reports.module";
import { SettingsModule } from "./settings/settings.module";
import { ShiftsModule } from "./shifts/shifts.module";
import { TelegramModule } from "./telegram/telegram.module";
import { UsersModule } from "./users/users.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: "../../.env",
		}),
		BullModule.forRoot({
			connection: (() => {
				const redisUrl = process.env.REDIS_HOST || "";
				// Coolify passes full URL: redis://default:password@host:port/db
				if (redisUrl.startsWith("redis://")) {
					const url = new URL(redisUrl);
					return {
						host: url.hostname,
						port: Number(url.port) || 6379,
						password: url.password || undefined,
					};
				}
				return {
					host: redisUrl || "localhost",
					port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
					password: process.env.REDIS_PASSWORD || undefined,
				};
			})(),
		}),
		DatabaseModule,
		UsersModule,
		EmployeesModule,
		AttendanceLogsModule,
		DevicesModule,
		ShiftsModule,
		ADMSModule,
		TelegramModule,
		AuditLogsModule,
		ReportsModule,
		AuthModule,
		SettingsModule,
		LeavesModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
