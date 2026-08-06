import type { ConnectionOptions } from "bullmq";

export function redisConnection(): ConnectionOptions {
	const host = process.env.REDIS_HOST || "localhost";
	if (host.startsWith("redis://") || host.startsWith("rediss://")) {
		const url = new URL(host);
		return {
			host: url.hostname,
			port: Number(url.port) || 6379,
			username: url.username || undefined,
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

export function requireEnv(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

export const workerPort = () => Number(process.env.WORKER_PORT) || 8888;

export const allowedOrigins = () =>
	(process.env.CORS_ORIGIN || "http://localhost:8080")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
