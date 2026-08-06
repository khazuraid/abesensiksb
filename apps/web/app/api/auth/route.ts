import { LoginSchema } from "@adms/shared-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle, parseWith } from "@/lib/server/api";
import { readSession, sessionCookieOptions } from "@/lib/server/auth";
import { auth, users } from "@/lib/server/container";
import { loginRateLimiter } from "@/lib/server/login-rate-limit";

const profileSchema = z
	.object({
		name: z.string().min(1).max(255).optional(),
		email: z.string().email().optional(),
	})
	.refine((value) => value.name || value.email, "No changes supplied");
const passwordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(12),
});

export async function POST(request: NextRequest) {
	return handle(request, async ({ body }) => {
		const data = parseWith(LoginSchema, body);
		const ip =
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			request.headers.get("x-real-ip") ||
			"unknown";
		const key = `${ip}:${data.email.toLowerCase()}`;
		await loginRateLimiter.check(key);
		const result = await auth.login(data);
		await loginRateLimiter.reset(key);
		const response = NextResponse.json(result);
		response.cookies.set(
			"token",
			result.access_token,
			sessionCookieOptions(request),
		);
		return response;
	});
}

export async function GET(request: NextRequest) {
	return handle(request, async () => {
		const session = await readSession(request);
		const user = await users.findOne(session.userId);
		if (!user || user.sessionVersion !== (session.sessionVersion ?? 0))
			throw new ApiError(401, "Sesi tidak berlaku lagi");
		return Object.fromEntries(
			Object.entries(user).filter(([key]) => key !== "password"),
		);
	});
}

export async function PATCH(request: NextRequest) {
	return handle(request, async ({ body }) => {
		const session = await readSession(request);
		const user = await users.findOne(session.userId);
		if (!user || user.sessionVersion !== (session.sessionVersion ?? 0))
			throw new ApiError(401, "Sesi tidak berlaku lagi");
		const action = request.nextUrl.searchParams.get("action") ?? "profile";
		if (action === "password") {
			const data = parseWith(passwordSchema, body);
			return auth.changePassword(
				session.userId,
				data.currentPassword,
				data.newPassword,
			);
		}
		return users.update(session.userId, parseWith(profileSchema, body));
	});
}

export async function DELETE(request: NextRequest) {
	return handle(request, async () => {
		const response = NextResponse.json({ message: "Logged out" });
		response.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0 });
		return response;
	});
}
