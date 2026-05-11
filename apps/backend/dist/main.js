import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { initTelemetry } from "./telemetry/otel.js";
initTelemetry();
const port = Number(process.env.PORT ?? 3001);
async function bootstrap() {
    const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: true }));
    await app.register(cors, {
        origin: true,
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
    });
    app.setGlobalPrefix("api", {
        exclude: ["health", "docs", "docs-json"],
    });
    const config = new DocumentBuilder()
        .setTitle("Cloud Solution Recommender API")
        .setDescription("Prompt-based cloud recommendation API with stubbed Yandex Cloud integration.")
        .setVersion("0.1.0")
        .addTag("recommendations")
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
    await app.listen(port, "0.0.0.0");
}
void bootstrap();
//# sourceMappingURL=main.js.map