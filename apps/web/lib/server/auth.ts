import { type Role, RoleSchema } from "@adms/shared-types";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { ApiError, type SessionUser } from "./api";

function secret() {
	const value = process.env.JWT_SECRET;
	if (!value) throw new Error("JWT_SECRET is required");
	return value;
}

export function createToken(user: SessionUser) {
	return jwt.sign(
		{
			email: user.email,
			sub: user.userId,
			role: user.role,
			sessionVersion: user.sessionVersion ?? 0,
		},
		secret(),
		{ expiresIn: "1d" },
	);
}

export function createSocketToken(user: SessionUser) {
	return jwt.sign({ sub: user.userId, role: user.role }, secret(), {
		expiresIn: "1m",
		audience: "worker-socket",
	});
}

export function sessionCookieOptions(request: NextRequest) {
	return {
		httpOnly: true,
		secure:
			(request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol)
				.split(",")[0]
				?.trim()
				.replace(":", "") === "https",
		sameSite: "lax" as const,
		path: "/",
		maxAge: 86400,
	};
}

export async function readSession(request: NextRequest): Promise<SessionUser> {
	const authorization = request.headers.get("authorization");
	const token = authorization?.startsWith("Bearer ")
		? authorization.slice(7)
		: request.cookies.get("token")?.value;
	if (!token) throw new ApiError(401, "Unauthorized");
	try {
		const payload = jwt.verify(token, secret()) as {
			sub: string | number;
			email: string;
			role: Role;
			sessionVersion?: number;
		};
		const userId = Number(payload.sub);
		const role = RoleSchema.safeParse(payload.role);
		if (!Number.isSafeInteger(userId) || !payload.email || !role.success) {
			throw new Error("Invalid payload");
		}
		return {
			userId,
			email: payload.email,
			role: role.data,
			sessionVersion: payload.sessionVersion ?? 0,
		};
	} catch {
		throw new ApiError(401, "Unauthorized");
	}
}
