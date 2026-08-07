import type { Role } from "@adms/shared-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export type SessionUser = {
	userId: number;
	email: string;
	role: Role;
	sessionVersion?: number;
};

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly details?: unknown,
	) {
		super(message);
	}
}

export type HandlerContext = {
	request: NextRequest;
	body: unknown;
	user?: SessionUser;
};

const MAX_JSON_BYTES = Number(process.env.MAX_API_BODY_BYTES) || 1_048_576;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function enforceRequestSecurity(request: NextRequest) {
	if (SAFE_METHODS.has(request.method)) return;
	const contentLength = Number(request.headers.get("content-length") || 0);
	if (contentLength > MAX_JSON_BYTES)
		throw new ApiError(413, "Request body too large");
	const origin = request.headers.get("origin");
	if (!origin) return;
	const forwardedHost = request.headers
		.get("x-forwarded-host")
		?.split(",")[0]
		?.trim();
	const host = forwardedHost || request.headers.get("host");
	const forwardedProto = request.headers
		.get("x-forwarded-proto")
		?.split(",")[0]
		?.trim();
	const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
	const publicOrigin = host ? `${protocol}://${host}` : request.nextUrl.origin;
	const configuredOrigin = process.env.WEB_PUBLIC_URL;
	if (
		origin !== publicOrigin &&
		origin !== request.nextUrl.origin &&
		origin !== configuredOrigin
	) {
		throw new ApiError(403, "Invalid request origin");
	}
}

export function requireRole(user: SessionUser, allowed: Role[]) {
	if (!allowed.includes(user.role)) {
		throw new ApiError(403, "Akses ditolak");
	}
}

export function parseWith<T>(schema: ZodType<T>, value: unknown): T {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		throw new ApiError(400, "Validation failed", parsed.error.flatten());
	}
	return parsed.data;
}

async function readBody(request: NextRequest): Promise<unknown> {
	if (!["POST", "PUT", "PATCH"].includes(request.method)) return undefined;
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return request.arrayBuffer();
	}
	try {
		return await request.json();
	} catch {
		throw new ApiError(400, "Invalid JSON body");
	}
}

function errorResponse(error: unknown) {
	if (error instanceof ApiError) {
		return NextResponse.json(
			{
				statusCode: error.status,
				message: error.message,
				...(error.details === undefined ? {} : { details: error.details }),
			},
			{ status: error.status },
		);
	}
	if (error instanceof ZodError) {
		return NextResponse.json(
			{
				statusCode: 400,
				message: "Validation failed",
				details: error.flatten(),
			},
			{ status: 400 },
		);
	}
	if (typeof error === "object" && error && "code" in error) {
		const code = String((error as { code?: unknown }).code);
		if (code === "23505") {
			return NextResponse.json(
				{ statusCode: 409, message: "Data already exists" },
				{ status: 409 },
			);
		}
		if (code === "23P01") {
			return NextResponse.json(
				{
					statusCode: 409,
					message: "Periode shift bentrok dengan jadwal yang sudah ada",
				},
				{ status: 409 },
			);
		}
		if (code === "23503") {
			return NextResponse.json(
				{ statusCode: 409, message: "Data is still referenced" },
				{ status: 409 },
			);
		}
	}
	console.error("Unhandled API error", error);
	return NextResponse.json(
		{ statusCode: 500, message: "Internal server error" },
		{ status: 500 },
	);
}

export async function handle(
	request: NextRequest,
	handler: (context: HandlerContext) => Promise<unknown> | unknown,
): Promise<NextResponse> {
	try {
		enforceRequestSecurity(request);
		const body = await readBody(request);
		const result = await handler({ request, body });
		if (result instanceof NextResponse) return result;
		if (result instanceof Response) {
			return new NextResponse(result.body, {
				status: result.status,
				headers: result.headers,
			});
		}
		return NextResponse.json(result ?? null);
	} catch (error) {
		return errorResponse(error);
	}
}

export function positiveInt(value: string | null, fallback?: number) {
	if (value === null || value === "") {
		if (fallback !== undefined) return fallback;
		throw new ApiError(400, "Expected a positive integer");
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new ApiError(400, "Expected a positive integer");
	}
	return parsed;
}

export function dateValue(value: unknown, name: string) {
	if (typeof value !== "string") throw new ApiError(400, `${name} is required`);
	const date = new Date(value);
	if (Number.isNaN(date.getTime()))
		throw new ApiError(400, `${name} is invalid`);
	return date;
}
