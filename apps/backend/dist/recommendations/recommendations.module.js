var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RECOMMENDATIONS_QUEUE } from "../queue/queue.module.js";
import { RecommendationsController } from "./recommendations.controller.js";
import { RecommendationsRepository } from "./recommendations.repository.js";
import { RecommendationsService } from "./recommendations.service.js";
import { RecommendationProcessor } from "./workers/recommendation.processor.js";
import { CloudRankerClient } from "./providers/cloud-ranker.client.js";
import { LiveRecommendationEngine } from "./providers/live-recommendation.engine.js";
import { YandexAiStudioClient } from "./providers/yandex-ai-studio.client.js";
let RecommendationsModule = class RecommendationsModule {
};
RecommendationsModule = __decorate([
    Module({
        imports: [
            BullModule.registerQueue({
                name: RECOMMENDATIONS_QUEUE,
            }),
        ],
        controllers: [RecommendationsController],
        providers: [
            RecommendationsRepository,
            RecommendationsService,
            RecommendationProcessor,
            YandexAiStudioClient,
            CloudRankerClient,
            LiveRecommendationEngine,
        ],
    })
], RecommendationsModule);
export { RecommendationsModule };
//# sourceMappingURL=recommendations.module.js.map