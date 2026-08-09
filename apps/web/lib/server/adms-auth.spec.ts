import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeSource = () =>
	readFile(
		new URL("../../app/iclock/[[...path]]/route.ts", import.meta.url),
		"utf8",
	);

test("ADMS menerima koneksi tanpa SN", async () => {
	const source = await routeSource();
	assert.doesNotMatch(source, /isRegisteredAdmsDevice/);
	assert.match(
		source,
		/const sn = request\.nextUrl\.searchParams\.get\("SN"\) \?\? "unknown"/,
	);
});

test("ADMS memakai body yang dibaca handler sekali", async () => {
	const source = await routeSource();
	assert.match(source, /return handle\(request, async \(\{ body \}\) =>/);
	assert.doesNotMatch(source, /request\.arrayBuffer\(\)/);
	assert.match(source, /Buffer\.from\(body as ArrayBuffer\)/);
});

test("ADMS langsung mendaftarkan terminal yang belum ada", async () => {
	const source = await routeSource();
	assert.match(source, /await adms\.findClaimedDevice\(ip\(request\)\)/);
	assert.match(source, /await adms\.registerDevice\(sn, ip\(request\)\)/);
	assert.match(source, /updateDeviceStatus\(sn, ip\(request\), device\?\.id\)/);
	assert.match(source, /getPendingCommands\(sn, device\?\.id, info\)/);
});
