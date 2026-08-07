import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const apiRoute = readFileSync(
	resolve(process.cwd(), "app/api/[[...path]]/route.ts"),
	"utf8",
);
const admsRoute = readFileSync(
	resolve(process.cwd(), "app/iclock/[[...path]]/route.ts"),
	"utf8",
);
const authRoute = readFileSync(
	resolve(process.cwd(), "app/api/auth/route.ts"),
	"utf8",
);
const authActionRoute = readFileSync(
	resolve(process.cwd(), "app/api/auth/[action]/route.ts"),
	"utf8",
);

const legacyParity = [
	["GET", "users"],
	["GET", "employees"],
	["GET", "devices"],
	["GET", "shifts"],
	["GET", "holidays"],
	["GET", "leaves"],
	["GET", "attendance-logs"],
	["GET", "reports"],
	["GET", "jaspel"],
	["GET", "settings"],
	["POST", "employees"],
	["POST", "devices"],
	["POST", "shifts"],
	["POST", "holidays"],
	["POST", "leaves"],
	["POST", "attendance-logs"],
	["POST", "jaspel"],
	["PATCH", "employees"],
	["PATCH", "devices"],
	["PATCH", "shifts"],
	["PATCH", "holidays"],
	["PATCH", "leaves"],
	["PATCH", "attendance-logs"],
	["PUT", "settings"],
	["PUT", "jaspel"],
	["DELETE", "employees"],
	["DELETE", "devices"],
	["DELETE", "shifts"],
	["DELETE", "holidays"],
	["DELETE", "leaves"],
] as const;

test("Next route handlers retain every legacy REST resource and verb", () => {
	for (const [method, resource] of legacyParity) {
		assert.match(apiRoute, new RegExp(`export async function ${method}\\(`));
		assert.match(
			apiRoute,
			new RegExp(`case "${resource}"|path\\[0\\] === "${resource}"`),
		);
	}
});

test("auth parity uses HttpOnly cookies and strips password fields", () => {
	for (const source of [authRoute, authActionRoute]) {
		assert.doesNotMatch(source, /return\s+user\s*;/);
		assert.match(source, /key\s*!==\s*"password"/);
	}
	assert.match(authActionRoute, /httpOnly:\s*true/);
	for (const action of [
		"login",
		"logout",
		"me",
		"profile",
		"password",
		"token",
	]) {
		assert.match(
			authActionRoute,
			new RegExp(`action\\s*(?:===|!==)\\s*"${action}"`),
		);
	}
});

test("ADMS parity covers data, photo, command polling and acknowledgement", () => {
	for (const marker of [
		"getrequest",
		"fdata",
		"devicecmd",
		"handleUserData",
		"handleFingerprintData",
		"handleLogData",
	]) {
		assert.match(admsRoute, new RegExp(marker));
	}
	assert.match(admsRoute, /findDevice/);
});

test("ADMS menandai perangkat terdaftar online saat polling konfigurasi", () => {
	assert.match(
		admsRoute,
		/const \{ sn, device \} = await authorize\(request\);\s*await adms\.updateDeviceStatus\(sn, ip\(request\)\);\s*if \(endpoint\(request\) === "getrequest"\)/s,
	);
});

test("ADMS tidak mewajibkan SN", () => {
	assert.doesNotMatch(admsRoute, /isRegisteredAdmsDevice/);
	assert.doesNotMatch(admsRoute, /recordUnidentifiedDevice/);
	assert.match(admsRoute, /searchParams\.get\("SN"\) \?\? "unknown"/);
});
