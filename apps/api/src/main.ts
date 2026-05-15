process.env.TZ = "Asia/Jakarta";

import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: false,
	});

	const httpAdapter = app.getHttpAdapter();
	const expressApp = httpAdapter.getInstance();

	// /iclock: mesin kirim plain text - parse sebagai raw buffer
	expressApp.use("/iclock", (req: any, res: any, next: () => void) => {
		if (req.method !== "POST") return next();
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			req.body = Buffer.concat(chunks);
			next();
		});
	});

	// /api: JSON body parser
	expressApp.use("/api", (req: any, res: any, next: () => void) => {
		if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") return next();
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

	// Serve foto absensi
	app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

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
