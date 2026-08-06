import { db } from "@adms/database";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
	AdmsService,
	AttendanceLogsService,
	AuditService,
	AuthService,
	DevicesService,
	EmployeesService,
	HolidaysService,
	JaspelService,
	LeavesService,
	ReportsService,
	SettingsService,
	ShiftEngineService,
	ShiftsService,
	UsersService,
} from "./services";

function redisConnection() {
	const host = process.env.REDIS_HOST || "localhost";
	if (host.startsWith("redis://") || host.startsWith("rediss://")) {
		const url = new URL(host);
		return {
			host: url.hostname,
			port: Number(url.port) || 6379,
			password: url.password || undefined,
			db: Number(url.pathname.slice(1)) || 0,
			tls: url.protocol === "rediss:" ? {} : undefined,
		};
	}
	return {
		host,
		port: Number(process.env.REDIS_PORT) || 6379,
		password: process.env.REDIS_PASSWORD || undefined,
	};
}

const globalState = globalThis as typeof globalThis & {
	admsQueue?: Queue;
	admsRedis?: IORedis;
};

export function getAdmsQueue() {
	const queue =
		globalState.admsQueue ??
		new Queue("adms-logs", { connection: redisConnection() });
	if (process.env.NODE_ENV !== "production") globalState.admsQueue = queue;
	return queue;
}

export async function getRedisClient() {
	const redis = globalState.admsRedis ?? new IORedis(redisConnection());
	if (process.env.NODE_ENV !== "production") globalState.admsRedis = redis;
	return redis;
}

export const users = new UsersService(db);
export const auth = new AuthService(users);
export const audit = new AuditService(db);
export const employees = new EmployeesService(db);
export const shifts = new ShiftsService(db);
export const devices = new DevicesService(db);
export const shiftEngine = new ShiftEngineService(db);
export const attendanceLogs = new AttendanceLogsService(db, shiftEngine);
export const leaves = new LeavesService(db);
export const settings = new SettingsService(db);
export const holidays = new HolidaysService(db, settings);
export const reports = new ReportsService(db);
export const jaspel = new JaspelService(db);
export const adms = new AdmsService(
	db,
	{
		add: (...args: Parameters<Queue["add"]>) => getAdmsQueue().add(...args),
	} as Queue,
	shiftEngine,
);
