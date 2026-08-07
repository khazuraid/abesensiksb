import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ADMS menerima koneksi tanpa SN", async () => {
	const source = await readFile(
		new URL("../../app/iclock/[[...path]]/route.ts", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(source, /isRegisteredAdmsDevice/);
	assert.doesNotMatch(source, /recordUnidentifiedDevice/);
	assert.match(
		source,
		/const sn = request\.nextUrl\.searchParams\.get\("SN"\) \?\? "unknown"/,
	);
});
