import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Guard untuk endpoint ADMS (/iclock/*).
 * Validasi berdasarkan:
 * 1. Query param `key` yang cocok dengan ADMS_SECRET_KEY env
 * 2. Jika ADMS_SECRET_KEY tidak di-set, allow all (dev mode)
 */
@Injectable()
export class AdmsGuard implements CanActivate {
	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const secret = this.configService.get<string>("ADMS_SECRET_KEY");
		if (!secret) return true; // Dev mode: no key required

		const request = context.switchToHttp().getRequest<Request>();
		const key = request.query?.key;

		if (key !== secret) {
			throw new UnauthorizedException("Invalid ADMS key");
		}
		return true;
	}
}
