import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TelegramService } from "./telegram.service";
import { TelegramCronService } from "./telegram-cron.service";

@Global()
@Module({
	providers: [
		{
			provide: "TELEGRAM_ENABLED",
			useFactory: (configService: ConfigService) => {
				const token = configService.get<string>("TELEGRAM_TOKEN");
				return !!token && token !== "DUMMY_TOKEN";
			},
			inject: [ConfigService],
		},
		TelegramService,
		TelegramCronService,
	],
	exports: [TelegramService, TelegramCronService],
})
export class TelegramModule {}
