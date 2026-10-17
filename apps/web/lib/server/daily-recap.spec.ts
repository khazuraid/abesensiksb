import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const services = readFileSync(
	resolve(process.cwd(), "lib/server/services.ts"),
	"utf8",
);

test("rekap harian mengambil scan pertama di window masuk dan scan terakhir di window pulang", () => {
	assert.match(services, /const inCandidates = dayLogs\.filter/);
	assert.match(services, /const outCandidates = dayLogs\.filter/);
	assert.match(services, /inLog = inCandidates\[0\]/);
	assert.match(services, /outLog = outCandidates\[outCandidates\.length - 1\]/);
});

test("rekap harian mendukung single scan dan memisahkannya berdasarkan midpoint jadwal", () => {
	assert.match(services, /if \(dayLogs\.length === 1\)/);
	assert.match(services, /if \(scanTime < midpoint\)/);
	assert.match(services, /inLog = singleScan;\s*outLog = undefined;/);
	assert.match(services, /inLog = undefined;\s*outLog = singleScan;/);
});

test("rekap harian mengakui scan pulang tunggal sebagai jam pulang dengan jam masuk kosong dan status ABSENT", () => {
	assert.match(services, /if \(!inLog\) \{\s*status = "ABSENT";/);
	assert.match(
		services,
		/clockIn: inLog \? formatTime\(inLog\.timestamp\) : null/,
	);
	assert.match(
		services,
		/clockOut: outLog \? formatTime\(outLog\.timestamp\) : null/,
	);
});

test("rekap harian memvalidasi rentang tanggal masa berlaku shift dan penempatan tanggal pegawai", () => {
	assert.match(
		services,
		/\(!s\.effectiveFrom \|\| dateStr >= s\.effectiveFrom\)/,
	);
	assert.match(services, /\(!s\.effectiveTo \|\| dateStr <= s\.effectiveTo\)/);
	assert.match(services, /assignment\.startDate <= dateStr/);
	assert.match(
		services,
		/\(!assignment\.endDate \|\| assignment\.endDate >= dateStr\)/,
	);
	assert.match(
		services,
		/const applicableShiftIds = datedShiftIds\.length\s*\?\s*datedShiftIds\s*:\s*employee\.shiftIds;/,
	);
});

test("evaluasi keterlambatan dan pulang cepat dicatat secara terpisah ke akumulasi tanpa saling menimpa", () => {
	assert.match(services, /if \(isLate\) totalLate\+\+;/);
	assert.match(services, /if \(isEarlyOut\) totalEarlyOut\+\+;/);
	assert.match(services, /totalLateMinutesSum \+= lateMinutes;/);
	assert.match(services, /totalEarlyOutMinutesSum \+= earlyOutMinutes;/);
});

test("tidak ada kalkulasi shift malam / overnight lintas hari pada rekap harian", () => {
	// Pastikan nextDayLogs dan overnight dihapus dari buildDailyRecap
	assert.doesNotMatch(services, /const nextDayLogs = logs/);
	assert.doesNotMatch(services, /const overnight = shift/);
	assert.doesNotMatch(services, /scan \+ 1440/);
});

test("alokasi sisa pembulatan Jaspel (Largest Remainder) hanya diberikan ke pegawai berpoin > 0", () => {
	assert.match(services, /filter\(\(r\) => r\.jumlahTotalPoin > 0\)/);
	assert.match(services, /eligible\[i\]!\.row\.finalAmount \+= 1/);
});
