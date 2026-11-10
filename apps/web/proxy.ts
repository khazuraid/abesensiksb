import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
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

export const proxy = middleware;

export const config = {
	matcher: ["/((?!iclock|uploads|_next/static|_next/image|favicon.ico).*)"],
};
