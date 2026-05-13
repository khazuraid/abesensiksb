import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { rawBody: true });

	app.enableCors({
		origin: process.env.CORS_ORIGIN || "http://localhost:3000",
		credentials: true,
	});

	app.setGlobalPrefix("api", {
		exclude: ["iclock/(.*)"],
	});

	const port = process.env.PORT || 3333;
	await app.listen(port);

	console.log(`API berjalan di http://localhost:${port}`);
}

bootstrap();
