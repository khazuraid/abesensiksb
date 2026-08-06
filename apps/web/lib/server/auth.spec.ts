import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { ApiError } from "./api";
import {
	createSocketToken,
	createToken,
	readSession,
	sessionCookieOptions,
} from "./auth";

const user = {
	userId: 7,
	email: "admin@example.com",
	role: "ADMIN" as const,
	sessionVersion: 0,
};

test("createToken and readSession preserve the authenticated user", async () => {
	process.env.JWT_SECRET = "test-secret-with-enough-entropy";
	const token = createToken(user);
	const request = new NextRequest("http://localhost/api/test", {
		headers: { authorization: `Bearer ${token}` },
	});
	assert.deepEqual(await readSession(request), user);
});

test("readSession accepts the HttpOnly cookie transport", async () => {
	process.env.JWT_SECRET = "test-secret-with-enough-entropy";
	const token = createToken(user);
	const request = new NextRequest("http://localhost/api/test", {
		headers: { cookie: `token=${token}` },
	});
	assert.deepEqual(await readSession(request), user);
});

test("session cookie stays usable on local HTTP", () => {
	const request = new NextRequest("http://localhost:8080/api/auth/login");
	assert.equal(sessionCookieOptions(request).secure, false);
});

test("session cookie stays Secure behind an HTTPS reverse proxy", () => {
	const request = new NextRequest("http://0.0.0.0:8080/api/auth/login", {
		headers: { "x-forwarded-proto": "https" },
	});
	assert.equal(sessionCookieOptions(request).secure, true);
});

test("readSession rejects requests without a token", async () => {
	const request = new NextRequest("http://localhost/api/test");
	await assert.rejects(
		() => readSession(request),
		(error) => error instanceof ApiError && error.status === 401,
	);
});

test("readSession rejects a signed token with an unknown role", async () => {
	process.env.JWT_SECRET = "test-secret-with-enough-entropy";
	const token = jwt.sign(
		{
			sub: user.userId,
			email: user.email,
			role: "SUPERADMIN",
			sessionVersion: 0,
		},
		process.env.JWT_SECRET,
	);
	const request = new NextRequest("http://localhost/api/test", {
		headers: { authorization: `Bearer ${token}` },
	});
	await assert.rejects(
		() => readSession(request),
		(error) => error instanceof ApiError && error.status === 401,
	);
});

test("socket token is short-lived and scoped to the worker", () => {
	process.env.JWT_SECRET = "test-secret-with-enough-entropy";
	const token = createSocketToken(user);
	const payload = jwt.verify(token, process.env.JWT_SECRET, {
		audience: "worker-socket",
	}) as jwt.JwtPayload;
	assert.equal(payload.sub, user.userId);
	assert.ok((payload.exp ?? 0) - (payload.iat ?? 0) <= 60);
});
