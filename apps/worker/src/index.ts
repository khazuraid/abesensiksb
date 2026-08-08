import { createServer } from "node:http";
import * as schema from "@adms/database";
import { db, pool } from "@adms/database";
import { Queue, Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import IORedis from "ioredis";
import { Server } from "socket.io";
import {
	allowedOrigins,
	redisConnection,
	requireEnv,
	workerPort,
} from "./config.js";
import { WorkerCron } from "./cron.js";
import {
	type AttendanceLogJob,
	processAttendanceJob,
	type WebhookPayload,
} from "./processor.js";
import { authorizeSocket, webhookHeaders } from "./security.js";
import { TelegramBot } from "./telegram.js";

const redisOptions = {
	host: process.env.REDIS_HOST || "localhost",
	port: Number(process.env.REDIS_PORT) || 6379,
	password: process.env.REDIS_PASSWORD || undefined,
};
const healthQueue = new Queue("adms-logs", { connection: redisConnection() });
const healthRedis = new IORedis({ ...redisOptions, maxRetriesPerRequest: 1 });
let workerState: "starting" | "running" | "draining" = "starting";
const httpServer = createServer(async (request, response) => {
	if (request.url === "/health" || request.url === "/health/live") {
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ status: "ok", service: "worker" }));
		return;
	}
	if (request.url === "/health/ready") {
		try {
			if (workerState !== "running") throw new Error(`Worker ${workerState}`);
			await pool.query("SELECT 1");
			if ((await healthRedis.ping()) !== "PONG")
				throw new Error("Redis unavailable");
			response
				.writeHead(200, { "content-type": "application/json" })
				.end(JSON.stringify({ status: "ready", postgres: "ok", redis: "ok" }));
		} catch (error) {
			response.writeHead(503, { "content-type": "application/json" }).end(
				JSON.stringify({
					status: "not-ready",
					error:
						error instanceof Error ? error.message : "dependency unavailable",
				}),
			);
		}
		return;
	}
	response.writeHead(404).end();
});

const io = new Server(httpServer, {
	cors: { origin: allowedOrigins(), credentials: true },
});

io.use((socket, next) => {
	try {
		const cookieToken = socket.handshake.headers.cookie
			?.split(";")
			.map((part) => part.trim().split("="))
			.find(([name]) => name === "token")?.[1];
		const token =
			(typeof socket.handshake.auth.token === "string" &&
				socket.handshake.auth.token) ||
			cookieToken;
		socket.data.user = authorizeSocket(token, requireEnv("JWT_SECRET"));
		next();
	} catch {
		next(new Error("Unauthorized"));
	}
});

const telegram = new TelegramBot(db);
const workerCron = new WorkerCron(db, telegram);

async function forwardWebhook(
	url: string,
	secret: string | null,
	payload: WebhookPayload,
	idempotencyKey: string,
) {
	const body = JSON.stringify(payload);
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const response = await fetch(url, {
		method: "POST",
		headers: {
			...webhookHeaders(timestamp, secret, body),
			"idempotency-key": idempotencyKey,
		},
		body,
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
}

const queueWorker = new Worker<AttendanceLogJob>(
	"adms-logs",
	async (job) => {
		console.info(
			`[worker] processing job ${job.id} emp=${job.data.log.employeeId} ts=${job.data.log.timestamp}`,
		);
		return processAttendanceJob(job.data, {
			insert: async (log) => {
				await db
					.insert(schema.attendanceLogs)
					.values(log)
					.onConflictDoNothing();
				const completed = await db
					.select({ effectName: schema.attendanceEffectCheckpoints.effectName })
					.from(schema.attendanceEffectCheckpoints)
					.where(
						and(
							eq(schema.attendanceEffectCheckpoints.employeeId, log.employeeId),
							eq(schema.attendanceEffectCheckpoints.timestamp, log.timestamp),
							eq(schema.attendanceEffectCheckpoints.type, log.type),
						),
					);
				return { completedEffects: completed.map((row) => row.effectName) };
			},
			findEmployee: async (id) => {
				const [employee] = await db
					.select({
						name: schema.employees.name,
						employeeCode: schema.employees.employeeCode,
						biometricId: schema.employees.biometricId,
					})
					.from(schema.employees)
					.where(eq(schema.employees.id, id));
				return employee;
			},
			findDevice: async (id) => {
				const [device] = await db
					.select({
						name: schema.devices.name,
						webhookUrl: schema.devices.webhookUrl,
						webhookSecret: schema.devices.webhookSecret,
					})
					.from(schema.devices)
					.where(eq(schema.devices.id, id));
				return device;
			},
			forward: forwardWebhook,
			notify: (data) => telegram.sendAttendanceAlert(data),
			emit: (event, data) => io.emit(event, data),
			checkpoint: async (completedEffects) => {
				const completed = completedEffects.at(-1);
				if (completed)
					await db
						.insert(schema.attendanceEffectCheckpoints)
						.values({
							employeeId: job.data.log.employeeId,
							timestamp: new Date(job.data.log.timestamp),
							type: job.data.log.type,
							effectName: completed,
						})
						.onConflictDoNothing();
				job.data.completedEffects = completedEffects;
				await job.updateData(job.data);
			},
		});
	},
	{
		connection: redisConnection(),
		concurrency: Math.max(1, Number(process.env.WORKER_CONCURRENCY) || 2),
		autorun: false,
	},
);

queueWorker.on("failed", (job, error) => {
	console.error(`Job ${job?.id ?? "unknown"} failed: ${error.message}`);
});

await telegram.start();
void queueWorker.run().catch((error) => {
	console.error(`Queue worker stopped: ${(error as Error).message}`);
	workerState = "starting";
});
workerState = "running";
workerCron.start();
httpServer.listen(workerPort(), "0.0.0.0", () => {
	console.info(`Worker listening on ${workerPort()}`);
});

async function shutdown() {
	if (workerState === "draining") return;
	workerState = "draining";
	telegram.stop();
	workerCron.stop();
	await queueWorker.close();
	await healthQueue.close();
	await healthRedis.quit();
	io.close();
	httpServer.close();
	await pool.end();
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
