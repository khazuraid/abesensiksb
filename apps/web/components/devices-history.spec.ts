import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
	new URL("../app/(dashboard)/devices/page.tsx", import.meta.url),
	"utf8",
);

test("device history reads sent commands and received attendance data", () => {
	assert.match(source, /\/devices\/\$\{selectedDeviceId\}\/commands/);
	assert.match(source, /\/attendance-logs\?/);
	assert.match(source, /Riwayat mengambil dan menerima data/);
	assert.doesNotMatch(source, /new Date\(\)\.toLocaleTimeString/);
});

test("attendance download sends the API command type and date range", () => {
	assert.match(source, /type: command/);
	assert.match(source, /start_date: pullStartDate/);
	assert.match(source, /end_date: pullEndDate/);
});

test("SN-less claim can register a terminal and pull employees", () => {
	assert.match(source, /\/devices\/claims\/\$\{claimId\}\/register/);
	assert.match(source, /Daftarkan & tarik pegawai/);
});
