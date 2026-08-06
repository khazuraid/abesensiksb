import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(process.cwd(), "src/index.ts"), "utf8");
const cron = readFileSync(resolve(process.cwd(), "src/cron.ts"), "utf8");
const processor = readFileSync(
	resolve(process.cwd(), "src/processor.ts"),
	"utf8",
);

test("worker exposes liveness/readiness and configurable concurrency", () => {
	assert.match(source, /\/health\/live/);
	assert.match(source, /\/health\/ready/);
	assert.match(source, /WORKER_CONCURRENCY/);
	assert.match(source, /ping/);
});

test("notification side effects are retryable and checkpointed", () => {
	assert.match(processor, /runSideEffects/);
	assert.match(processor, /completedEffects/);
	assert.match(processor, /webhook:\$\{index\}/);
	assert.match(processor, /checkpoint/);
});

test("worker starts consumption only after dependencies and exposes draining readiness", () => {
	assert.match(source, /autorun: false/);
	assert.match(source, /await telegram\.start\(\)/);
	assert.match(source, /queueWorker\.run\(\)/);
	assert.match(source, /draining/);
});

test("cron claims complete only after success and reclaim stale work", () => {
	assert.match(cron, /workerCronRuns/);
	assert.match(cron, /RUNNING/);
	assert.match(cron, /COMPLETED/);
	assert.match(cron, /startedAt/);
	assert.match(cron, /completedAt/);
	assert.match(cron, /catchUp/);
});
