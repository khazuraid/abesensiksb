import { Module } from "@nestjs/common";
import { HolidaysController } from "./holidays.controller";
import { HolidaysService } from "./holidays.service";
import { ShiftEngineService } from "./shift-engine.service";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";

@Module({
	controllers: [ShiftsController, HolidaysController],
	providers: [ShiftsService, ShiftEngineService, HolidaysService],
	exports: [ShiftEngineService],
})
export class ShiftsModule {}
