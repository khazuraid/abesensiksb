process.env.TZ = "Asia/Jakarta";

import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { json, raw, text } from "express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: false,
	});

	// /iclock: mesin kirim plain text
	app.use("/iclock", raw({ type: "*/*", limit: "10mb" }));

	// /api: JSON body parser
	app.use("/api", json({ limit: "10mb" }));

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
