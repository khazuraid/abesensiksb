import { db } from "@adms/database";
import { Global, Module } from "@nestjs/common";

export const DRIZZLE = "DRIZZLE";

@Global()
@Module({
	providers: [
		{
			provide: DRIZZLE,
			useValue: db,
		},
	],
	exports: [DRIZZLE],
})
export class DatabaseModule {}
