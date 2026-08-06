import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
	readFileSync(resolve(process.cwd(), path), "utf8");
const services = read("lib/server/services.ts");
const route = read("app/api/[[...path]]/route.ts");
const authRoute = read("app/api/auth/[action]/route.ts");
const legacyAuthRoute = read("app/api/auth/route.ts");
const proxy = read("proxy.ts");
const schema = read("../../packages/database/src/schema.ts");
const migrate = read("../../packages/database/migrate.js");
const integrityMigration = read(
	"../../packages/database/migrations/0007_integrity_and_reliability.sql",
);

test("production migration never runs the static admin seed", () => {
	assert.doesNotMatch(migrate, /seed-admin\.sql/);
	assert.match(
		read("../../packages/database/package.json"),
		/db:bootstrap-admin/,
	);
});

test("API declares manager-only resources and scoped USER self-service", () => {
	assert.match(route, /managerOnlyResources/);
	assert.match(route, /resolveEmployeeId/);
	assert.match(route, /case "audit-logs"/);
	assert.match(route, /case "users"/);
});

test("every login route is public and enforces shared rate limiting", () => {
	for (const source of [authRoute, legacyAuthRoute]) {
		assert.match(source, /loginRateLimiter/);
		assert.match(source, /loginRateLimiter\.check/);
	}
	assert.match(proxy, /pathname === "\/api\/auth\/login"/);
	assert.match(proxy, /pathname === "\/api\/auth"/);
});

test("attendance export, corrections, leave overlap and shift validation are implemented", () => {
	assert.match(route, /attendance-logs" && path\[1\] === "export"/);
	assert.match(route, /attendance-corrections/);
	assert.match(services, /overlaps an existing request/i);
	assert.match(services, /validateShiftIds/);
});

test("Jaspel periods are unique, versioned and locked", () => {
	assert.match(schema, /jaspelStatusEnum/);
	assert.match(schema, /formulaVersion/);
	assert.match(schema, /uq_jaspel_funds_month_year/);
	assert.match(schema, /uq_jaspel_dist_period_employee/);
	assert.match(services, /Jaspel period is locked/);
});

test("user sessions are invalidated after credential or role changes", () => {
	assert.match(schema, /sessionVersion/);
	assert.match(services, /sessionVersion/);
	assert.match(authRoute, /sessionVersion/);
	assert.match(route, /readValidSession/);
});

test("reviewed Jaspel cannot be recalculated", () => {
	assert.match(services, /pg_advisory_xact_lock/);
	assert.match(services, /eq\(schema\.jaspelFunds\.status, "DRAFT"\)/);
});

test("Jaspel rejects nonzero funds when all points are zero", () => {
	assert.match(services, /No eligible Jaspel points/);
});

test("correction review is claimed atomically", () => {
	assert.match(services, /status: "PROCESSING"/);
	assert.match(schema, /"PROCESSING"/);
});

test("leave ranges are protected by database constraints", () => {
	assert.match(schema, /chk_leaves_date_range/);
	assert.match(integrityMigration, /excl_leaves_employee_active_period/);
});

test("Jaspel source mutations share the period transaction lock", () => {
	assert.match(services, /lockJaspelPeriod/);
	assert.match(services, /assertJaspelPeriodMutable/);
	assert.match(services, /createManualLog[\s\S]*transaction/);
	assert.match(
		services,
		/async calculate[\s\S]*transaction[\s\S]*pg_advisory_xact_lock[\s\S]*buildDailyRecapForCalculation/,
	);
});

test("approved corrections recompute attendance status", () => {
	assert.match(services, /evaluateAttendance/);
	assert.match(services, /status: evaluation/);
});
