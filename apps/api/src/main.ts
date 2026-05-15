process.env.TZ = "Asia/Jakarta";

import { NestFactory } from "@nestjs/core";
import type { IncomingMessage, ServerResponse } from "http";
import { AppModule } from "./app.module";

function rawBodyMiddleware(req: IncomingMessage & { body?: Buffer | string; rawBody?: Buffer }, res: ServerResponse, next: () => void) {
	if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
		return next();
	}
	const chunks: Buffer[] = [];
	req.on("data", (chunk: Buffer) => chunks.push(chunk));
	req.on("end", () => {
		const buf = Buffer.concat(chunks);
		req.rawBody = buf;
		req.body = buf;
		next();
	});
}

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bodyParser: false });

	// Custom body parsing: raw untuk /iclock, JSON untuk sisanya
	const httpAdapter = app.getHttpAdapter();
	httpAdapter.use("/iclock", rawBodyMiddleware);

	// JSON parser untuk route /api (re-enable body parser untuk non-iclock)
	httpAdapter.use("/api", (req: any, res: any, next: () => void) => {
		if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
			return next();
		}
		if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
			return next();
		}
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			try {
				req.body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
			} catch {
				req.body = {};
			}
			next();
		});
	});

	app.enableCors({
		origin: process.env.CORS_ORIGIN || "http://localhost:8080",
		credentials: true,
		exposedHeaders: ["Content-Disposition"],
	});

	app.setGlobalPrefix("api", {
		exclude: ["iclock", "iclock/(.*)"],
	});

	const port = process.env.PORT || 8888;
	await app.listen(port);

	console.log(`API berjalan di http://localhost:${port}`);
}

bootstrap();
