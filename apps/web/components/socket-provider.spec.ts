import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
	new URL("../providers/socket-provider.tsx", import.meta.url),
	"utf8",
);

test("worker socket only connects when a public worker URL is configured", () => {
	assert.match(
		source,
		/const workerUrl = process\.env\.NEXT_PUBLIC_WORKER_URL/,
	);
	assert.match(source, /if \(!workerUrl\) return null/);
	assert.doesNotMatch(source, /window\.location\.hostname}:8888/);
});
