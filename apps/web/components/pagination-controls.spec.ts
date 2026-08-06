import assert from "node:assert/strict";
import test from "node:test";
import { pageWindow } from "./pagination-controls";

test("pageWindow keeps a short pagination sequence complete", () => {
	assert.deepEqual(pageWindow(2, 4), [1, 2, 3, 4]);
});

test("pageWindow limits long pagination sequences around the active page", () => {
	assert.deepEqual(pageWindow(1, 12), [1, 2, 3, 4, 5]);
	assert.deepEqual(pageWindow(6, 12), [4, 5, 6, 7, 8]);
	assert.deepEqual(pageWindow(12, 12), [8, 9, 10, 11, 12]);
});
