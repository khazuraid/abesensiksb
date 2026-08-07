import assert from "node:assert/strict";
import test from "node:test";
import {
	assertValidShiftAssignmentRange,
	overlapsShiftAssignment,
} from "./shift-assignment";

test("rentang penempatan shift memakai batas tanggal inklusif", () => {
	assert.equal(
		overlapsShiftAssignment(
			{ startDate: "2026-08-01", endDate: "2026-08-10" },
			{ startDate: "2026-08-10", endDate: "2026-08-20" },
		),
		true,
	);
	assert.equal(
		overlapsShiftAssignment(
			{ startDate: "2026-08-01", endDate: "2026-08-09" },
			{ startDate: "2026-08-10", endDate: "2026-08-20" },
		),
		false,
	);
});

test("rentang terbuka bertabrakan dengan periode berikutnya", () => {
	assert.equal(
		overlapsShiftAssignment(
			{ startDate: "2026-08-01", endDate: null },
			{ startDate: "2027-01-01", endDate: "2027-01-31" },
		),
		true,
	);
});

test("rentang kosong tidak bertabrakan", () => {
	assert.equal(
		overlapsShiftAssignment(
			{ startDate: "2026-08-01", endDate: "2026-08-10" },
			{ startDate: "2026-08-11", endDate: "2026-08-20" },
		),
		false,
	);
});

test("tanggal selesai tidak boleh sebelum tanggal mulai", () => {
	assert.throws(
		() => assertValidShiftAssignmentRange("2026-08-10", "2026-08-09"),
		/Tanggal selesai tidak boleh sebelum tanggal mulai/,
	);
});
