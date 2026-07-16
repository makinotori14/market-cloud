import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RECOMMENDATIONS_QUEUE } from "../queue/queue.module.js";
import { RecommendationsController } from "./recommendations.controller.js";
import { RecommendationsRepository } from "./recommendations.repository.js";
import { RecommendationsService } from "./recommendations.service.js";
import { RecommendationProcessor } from "./workers/recommendation.processor.js";
import { CloudRankerClient } from "./providers/cloud-ranker.client.js";
import { LiveRecommendationEngine } from "./providers/live-recommendation.engine.js";
import { LlmExtractionClient } from "./providers/yandex-ai-studio.client.js";
import { LlmExplanationClient } from "./providers/yandex-explanation-agent.client.js";
import { OpenAiCompatibleClient } from "./providers/openai-compatible.client.js";

@Module({
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
    OpenAiCompatibleClient,
    LlmExtractionClient,
    LlmExplanationClient,
    CloudRankerClient,
    LiveRecommendationEngine,
  ],
})
export class RecommendationsModule {}
