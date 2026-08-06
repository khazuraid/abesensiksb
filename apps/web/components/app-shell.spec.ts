import assert from "node:assert/strict";
import test from "node:test";
import { fallbackRole, roleHome } from "./app-shell";

test("roleHome keeps managers on the dashboard and users on profile", () => {
	assert.equal(roleHome("ADMIN"), "/");
	assert.equal(roleHome("HRD"), "/");
	assert.equal(roleHome("USER"), "/profile");
});

test("fallbackRole rejects unknown persisted role values", () => {
	assert.equal(fallbackRole("ADMIN"), "ADMIN");
	assert.equal(fallbackRole("USER"), "USER");
	assert.equal(fallbackRole("OWNER"), null);
	assert.equal(fallbackRole(undefined), null);
});
