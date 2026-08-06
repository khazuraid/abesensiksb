import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import { workerCronSchedules } from "./cron.js";
import { formatWebhookPayload, processAttendanceJob } from "./processor.js";
import { authorizeSocket, webhookHeaders } from "./security.js";

const secret = "test-secret";

test("socket auth accepts valid JWT", () => {
	const token = jwt.sign({ sub: 1, role: "ADMIN" }, secret, {
		audience: "worker-socket",
	});
	assert.deepEqual(authorizeSocket(token, secret), {
		userId: 1,
		role: "ADMIN",
	});
});

test("socket auth rejects missing and invalid JWT", () => {
	assert.throws(() => authorizeSocket(undefined, secret), /Unauthorized/);
	assert.throws(() => authorizeSocket("invalid", secret), /Unauthorized/);
	assert.throws(
		() => authorizeSocket(jwt.sign({ sub: 1, role: "ADMIN" }, secret), secret),
		/Unauthorized/,
	);
});

test("worker schedules Telegram operational checks in WIB", () => {
	assert.deepEqual(workerCronSchedules, {
		dailyReport: "30 17 * * *",
		missingClockOut: "0 22 * * *",
		anomalousCheckin: "0 0,1,2,3,4 * * *",
		deviceDowntime: "*/10 * * * *",
		deviceCapacity: "0 12 * * *",
	});
});

test("webhook signature signs timestamp plus body", () => {
	const body = JSON.stringify({ employeeId: 1 });
	const headers = webhookHeaders("123", "hook-secret", body);
	assert.equal(headers["x-adms-timestamp"], "123");
	assert.equal(
		headers["x-adms-signature"],
		`sha256=${createHmac("sha256", "hook-secret").update(`123.${body}`).digest("hex")}`,
	);
});

test("attendance worker persists then broadcasts a normalized event", async () => {
	const calls: string[] = [];
	const emitted: unknown[] = [];
	const result = await processAttendanceJob(
		{
			sn: "SN-1",
			log: {
				employeeId: 1,
				deviceId: 2,
				timestamp: "2026-08-03T01:02:03.000Z",
				type: "IN",
				status: "PRESENT",
			},
		},
		{
			insert: async () => {
				calls.push("insert");
			},
			findEmployee: async () => ({
				name: "Fikri",
				employeeCode: "E1",
				biometricId: null,
			}),
			findDevice: async () => ({
				name: "Office",
				webhookUrl: null,
				webhookSecret: null,
			}),
			forward: async () => {
				calls.push("forward");
			},
			notify: async () => {
				calls.push("notify");
			},
			emit: (_event, data) => emitted.push(data),
		},
	);
	assert.deepEqual(calls, ["insert", "notify"]);
	assert.equal(result.success, true);
	assert.equal((emitted[0] as { employeeName: string }).employeeName, "Fikri");
});

test("attendance worker skips effects already persisted with a duplicate log", async () => {
	const calls: string[] = [];
	await processAttendanceJob(
		{
			sn: "SN-1",
			log: {
				employeeId: 1,
				deviceId: null,
				timestamp: "2026-08-03T01:02:03.000Z",
				type: "IN",
				status: "PRESENT",
			},
		},
		{
			insert: async () => ({ completedEffects: ["telegram", "socket"] }),
			findEmployee: async () => undefined,
			findDevice: async () => undefined,
			forward: async () => {
				calls.push("webhook");
			},
			notify: async () => {
				calls.push("telegram");
			},
			emit: () => calls.push("socket"),
		},
	);
	assert.deepEqual(calls, []);
});

test("attendance worker retries failed side effects without replaying completed ones", async () => {
	const calls: string[] = [];
	let failTelegram = true;
	const job = {
		sn: "SN-1",
		log: {
			employeeId: 1,
			deviceId: 2,
			timestamp: "2026-08-03T01:02:03.000Z",
			type: "IN" as const,
			status: "PRESENT" as const,
		},
	};
	const checkpointed: string[][] = [];
	const deps = {
		insert: async () => undefined,
		findEmployee: async () => ({
			name: "Fikri",
			employeeCode: "E1",
			biometricId: null,
		}),
		findDevice: async () => ({
			name: "Office",
			webhookUrl: "https://example.test",
			webhookSecret: null,
		}),
		forward: async () => {
			calls.push("webhook");
		},
		notify: async () => {
			calls.push("telegram");
			if (failTelegram) throw new Error("telegram down");
		},
		emit: () => {
			calls.push("socket");
		},
		checkpoint: async (completed: string[]) => {
			checkpointed.push([...completed]);
		},
	};
	await assert.rejects(() => processAttendanceJob(job, deps), /telegram down/);
	assert.deepEqual(checkpointed, [["webhook:0"]]);
	failTelegram = false;
	await processAttendanceJob(
		{ ...job, completedEffects: checkpointed.at(-1) },
		deps,
	);
	assert.deepEqual(calls, ["webhook", "telegram", "telegram", "socket"]);
});

test("webhook payload preserves the ADMS compatibility shape", () => {
	assert.deepEqual(
		formatWebhookPayload(
			"SN-1",
			{
				employeeId: 1,
				deviceId: null,
				timestamp: new Date("2026-08-03T01:02:03.000Z"),
				type: "OUT",
				status: "EARLY_OUT",
			},
			{ biometricId: "7", employeeCode: "E1" },
		),
		{
			sn: "SN-1",
			timestamp: "2026-08-03 01:02:03",
			user_id: "7",
			verify: 1,
			status: 1,
			workcode: 0,
		},
	);
});
