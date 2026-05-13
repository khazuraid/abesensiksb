import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@Get()
	getAll() {
		return this.settingsService.getAll();
	}

	@Put()
	update(@Body() data: Record<string, string>) {
		return this.settingsService.setBulk(data);
	}
}
