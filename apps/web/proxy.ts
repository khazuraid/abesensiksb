import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const token = request.cookies.get("token")?.value;
	const { pathname } = request.nextUrl;
	const requestHeaders = new Headers(request.headers);
	if (!requestHeaders.has("x-forwarded-host")) {
		requestHeaders.set(
			"x-forwarded-host",
			request.headers.get("host") ?? request.nextUrl.host,
		);
	}
	if (!requestHeaders.has("x-forwarded-proto")) {
		requestHeaders.set(
			"x-forwarded-proto",
			request.nextUrl.protocol.replace(":", ""),
		);
	}
	const next = () =>
		NextResponse.next({ request: { headers: requestHeaders } });

	if (pathname === "/login") {
		if (token) return NextResponse.redirect(new URL("/", request.url));
		return next();
	}
	if (
		pathname === "/api/health-db" ||
		pathname === "/api/auth" ||
		pathname === "/api/auth/login"
	)
		return next();

	if (!token) return NextResponse.redirect(new URL("/login", request.url));
	return next();
}

// Tentukan path mana yang akan diproses middleware
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api, iclock, uploads (server routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!iclock|uploads|_next/static|_next/image|favicon.ico).*)",
	],
};
