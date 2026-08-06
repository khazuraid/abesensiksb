import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("list services apply database limit and offset", async () => {
	const source = await readFile(
		new URL("./services.ts", import.meta.url),
		"utf8",
	);
	for (const service of [
		"UsersService",
		"EmployeesService",
		"ShiftsService",
		"DevicesService",
	]) {
		const body =
			source.match(
				new RegExp(`export class ${service}([\\s\\S]*?)(?=export class)`),
			)?.[1] ?? "";
		assert.match(body, /normalizePageParams/);
		assert.match(body, /\.limit\(pagination\.limit\)/);
		assert.match(body, /\.offset\(pagination\.offset\)/);
		assert.match(body, /createPageMeta/);
	}
});

test("report and jaspel list methods apply database pagination", async () => {
	const source = await readFile(
		new URL("./services.ts", import.meta.url),
		"utf8",
	);
	for (const method of [
		"getCommands",
		"getDailyRecap",
		"getVariables",
		"getDistributions",
	]) {
		const body =
			source.match(new RegExp(`async ${method}\\([\\s\\S]*?\\n\\t}`))?.[0] ??
			"";
		assert.match(body, /normalizePageParams/);
		assert.match(body, /createPageMeta/);
	}
});
