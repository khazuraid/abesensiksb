import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ShiftsModule } from "../shifts/shifts.module";
import { ADMSController } from "./adms.controller";
import { AdmsGuard } from "./adms.guard";
import { ADMSProcessor } from "./adms.processor";
import { ADMSService } from "./adms.service";
import { WebhookService } from "./webhook.service";

@Module({
	imports: [
		BullModule.registerQueue({ name: "adms-logs" }),
		ShiftsModule,
	],
	controllers: [ADMSController],
	providers: [ADMSService, ADMSProcessor, WebhookService, AdmsGuard],
	exports: [ADMSService],
})
export class ADMSModule {}
