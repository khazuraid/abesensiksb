import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { ApiError, handle, requireRole } from "./api";

const request = (method = "GET", body?: unknown) =>
	new NextRequest("http://localhost/api/test", {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
		headers:
			body === undefined ? undefined : { "content-type": "application/json" },
	});

test("handle maps ApiError to the documented JSON envelope", async () => {
	const response = await handle(request(), async () => {
		throw new ApiError(404, "Tidak ditemukan");
	});
	assert.equal(response.status, 404);
	assert.deepEqual(await response.json(), {
		statusCode: 404,
		message: "Tidak ditemukan",
	});
});

test("handle rejects invalid JSON", async () => {
	const invalid = new NextRequest("http://localhost/api/test", {
		method: "POST",
		body: "{",
		headers: { "content-type": "application/json" },
	});
	const response = await handle(invalid, async ({ body }) => body);
	assert.equal(response.status, 400);
});

test("requireRole denies a role outside the allowlist", () => {
	assert.throws(
		() =>
			requireRole({ userId: 1, email: "user@example.com", role: "USER" }, [
				"ADMIN",
			]),
		(error) => error instanceof ApiError && error.status === 403,
	);
});

test("handle serializes successful data", async () => {
	const response = await handle(
		request("POST", { ok: true }),
		async ({ body }) => body,
	);
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { ok: true });
});

test("handle rejects cross-origin mutations", async () => {
	const crossOrigin = new NextRequest("http://localhost/api/test", {
		method: "POST",
		body: JSON.stringify({ ok: true }),
		headers: {
			"content-type": "application/json",
			origin: "https://evil.example",
		},
	});
	const response = await handle(crossOrigin, async () => ({ ok: true }));
	assert.equal(response.status, 403);
});

test("handle accepts same-origin mutations behind a reverse proxy", async () => {
	const proxied = new NextRequest("http://0.0.0.0:8080/api/test", {
		method: "POST",
		body: JSON.stringify({ ok: true }),
		headers: {
			"content-type": "application/json",
			host: "attendance.example.com",
			origin: "https://attendance.example.com",
			"x-forwarded-host": "attendance.example.com",
			"x-forwarded-proto": "https",
		},
	});
	const response = await handle(proxied, async ({ body }) => body);
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { ok: true });
});

test("handle accepts the configured public origin when proxy headers are unavailable", async () => {
	process.env.WEB_PUBLIC_URL = "https://attendance.example.com";
	const proxied = new NextRequest("http://0.0.0.0:8080/api/test", {
		method: "POST",
		body: JSON.stringify({ ok: true }),
		headers: {
			"content-type": "application/json",
			host: "0.0.0.0:8080",
			origin: "https://attendance.example.com",
		},
	});
	const response = await handle(proxied, async ({ body }) => body);
	delete process.env.WEB_PUBLIC_URL;
	assert.equal(response.status, 200);
});

test("handle rejects oversized request bodies", async () => {
	const oversized = new NextRequest("http://localhost/api/test", {
		method: "POST",
		body: "{}",
		headers: {
			"content-type": "application/json",
			"content-length": "1048577",
		},
	});
	const response = await handle(oversized, async () => ({ ok: true }));
	assert.equal(response.status, 413);
});
