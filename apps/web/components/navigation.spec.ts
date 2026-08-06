import assert from "node:assert/strict";
import test from "node:test";
import { navigationForRole } from "./navigation";

test("USER navigation only exposes self-service pages", () => {
	const hrefs = navigationForRole("USER").flatMap((group) =>
		group.items.map((item) => item.href),
	);
	assert.deepEqual(hrefs, ["/profile"]);
});

test("HRD navigation exposes operations but not system administration", () => {
	const hrefs = navigationForRole("HRD").flatMap((group) =>
		group.items.map((item) => item.href),
	);
	assert.ok(hrefs.includes("/employees"));
	assert.ok(hrefs.includes("/reports"));
	assert.ok(!hrefs.includes("/settings"));
	assert.ok(!hrefs.includes("/users"));
	assert.ok(!hrefs.includes("/audit-logs"));
});

test("ADMIN navigation exposes user and audit administration", () => {
	const hrefs = navigationForRole("ADMIN").flatMap((group) =>
		group.items.map((item) => item.href),
	);
	assert.ok(hrefs.includes("/users"));
	assert.ok(hrefs.includes("/audit-logs"));
	assert.ok(hrefs.includes("/settings"));
});
