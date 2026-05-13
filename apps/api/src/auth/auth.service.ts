import type { Login } from "@adms/shared-types";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
	) {}

	async validateUser(email: string, pass: string): Promise<unknown> {
		const user = await this.usersService.findByEmail(email);
		if (user && (await bcrypt.compare(pass, user.password))) {
			const { password: _, ...result } = user;
			return result;
		}
		return null;
	}

	async login(loginDto: Login) {
		const user = (await this.validateUser(
			loginDto.email,
			loginDto.password,
		)) as {
			id: number;
			name: string;
			email: string;
			role: string;
		} | null;

		if (!user) {
			throw new UnauthorizedException("Kredensial tidak valid");
		}

		const payload = { email: user.email, sub: user.id, role: user.role };
		return {
			access_token: this.jwtService.sign(payload),
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		};
	}

	async changePassword(userId: number, currentPassword: string, newPassword: string) {
		const user = await this.usersService.findOne(userId);
		if (!user) {
			throw new UnauthorizedException("User tidak ditemukan");
		}

		const valid = await bcrypt.compare(currentPassword, user.password);
		if (!valid) {
			throw new UnauthorizedException("Password lama salah");
		}

		const hash = await bcrypt.hash(newPassword, 10);
		await this.usersService.updatePassword(userId, hash);
		return { message: "Password berhasil diubah" };
	}
}
