import assert from "node:assert/strict";
import test from "node:test";
import { createPageMeta, normalizePageParams } from "./pagination";

test("normalizePageParams defaults to the first page with ten rows", () => {
	assert.deepEqual(normalizePageParams(), { page: 1, limit: 10, offset: 0 });
});

test("normalizePageParams clamps invalid and excessive values", () => {
	assert.deepEqual(normalizePageParams({ page: 0, limit: 500 }), {
		page: 1,
		limit: 100,
		offset: 0,
	});
	assert.deepEqual(normalizePageParams({ page: 3, limit: 25 }), {
		page: 3,
		limit: 25,
		offset: 50,
	});
});

test("createPageMeta describes the selected slice", () => {
	assert.deepEqual(createPageMeta(26, { page: 2, limit: 10, offset: 10 }), {
		total: 26,
		page: 2,
		limit: 10,
		totalPages: 3,
	});
});
