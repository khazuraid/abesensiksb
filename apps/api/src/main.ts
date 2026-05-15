import { NestFactory } from "@nestjs/core";
import express from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { rawBody: true });

	// Mesin ADMS kirim body sebagai text/plain atau tanpa content-type
	app.use("/iclock", express.text({ type: "*/*" }));

	app.enableCors({
		origin: process.env.CORS_ORIGIN || "http://localhost:8080",
		credentials: true,
	});

	app.setGlobalPrefix("api", {
		exclude: ["iclock", "iclock/(.*)"],
	});

	const port = process.env.PORT || 8888;
	await app.listen(port);

	console.log(`API berjalan di http://localhost:${port}`);
}

bootstrap();
