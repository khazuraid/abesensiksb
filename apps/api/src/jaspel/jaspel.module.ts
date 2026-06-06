import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ReportsModule } from "../reports/reports.module";
import { JaspelController } from "./jaspel.controller";
import { JaspelService } from "./jaspel.service";

@Module({
	imports: [DatabaseModule, ReportsModule],
	controllers: [JaspelController],
	providers: [JaspelService],
})
export class JaspelModule {}
