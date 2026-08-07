import assert from "node:assert/strict";
import test from "node:test";
import { isRegisteredAdmsDevice } from "./adms-auth";

test("ADMS menerima perangkat hanya saat SN cocok dengan perangkat terdaftar", () => {
	assert.equal(isRegisteredAdmsDevice("ZK-001", "ZK-001"), true);
	assert.equal(isRegisteredAdmsDevice("ZK-001", "ZK-002"), false);
	assert.equal(isRegisteredAdmsDevice("ZK-001", undefined), false);
	assert.equal(isRegisteredAdmsDevice("", "ZK-001"), false);
});
