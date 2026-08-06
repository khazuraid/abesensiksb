import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
	new URL("../providers/socket-provider.tsx", import.meta.url),
	"utf8",
);

test("worker socket follows the browser host when no public URL is built in", () => {
	assert.match(source, /window\.location\.hostname}:8888/);
});
