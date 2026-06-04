import { type Login, LoginSchema } from "@adms/shared-types";
import {
	Body,
	Controller,
	Get,
	Patch,
	Post,
	Req,
	UseGuards,
	UsePipes,
} from "@nestjs/common";
import type { Request } from "express";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly usersService: UsersService,
	) {}

	@Post("login")
	@UsePipes(new ZodValidationPipe(LoginSchema))
	async login(@Body() loginDto: Login) {
		return this.authService.login(loginDto);
	}

	@Get("me")
	@UseGuards(JwtAuthGuard)
	async getProfile(@Req() req: Request) {
		const payload = req.user as { userId: number };
		const user = await this.usersService.findOne(payload.userId);
		if (!user) return req.user;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password: _, ...safe } = user as Record<string, unknown>;
		return safe;
	}

	@Patch("profile")
	@UseGuards(JwtAuthGuard)
	async updateProfile(
		@Req() req: Request,
		@Body() body: { name?: string; email?: string },
	) {
		const payload = req.user as { userId: number };
		return this.usersService.update(payload.userId, body);
	}

	@Patch("password")
	@UseGuards(JwtAuthGuard)
	async changePassword(
		@Req() req: Request,
		@Body() body: { currentPassword: string; newPassword: string },
	) {
		const payload = req.user as { userId: number };
		return this.authService.changePassword(
			payload.userId,
			body.currentPassword,
			body.newPassword,
		);
	}
}
