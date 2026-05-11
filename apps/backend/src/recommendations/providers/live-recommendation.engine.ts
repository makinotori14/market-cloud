import { Injectable } from "@nestjs/common";
import { CloudRankerClient } from "./cloud-ranker.client.js";
import { YandexAiStudioClient } from "./yandex-ai-studio.client.js";
import type { YandexCloudStubResponse } from "../schemas/recommendation.schema.js";

@Injectable()
export class LiveRecommendationEngine {
  constructor(
    private readonly aiStudio: YandexAiStudioClient,
    private readonly ranker: CloudRankerClient,
  ) {}

  async getRecommendations(prompt: string): Promise<YandexCloudStubResponse> {
    const aiResponse = await this.aiStudio.extractIntent(prompt);
    const rankerResponse = await this.ranker.rank(aiResponse.intent);

    return {
      model: "yandex-ai-studio/responses + sentence-bert-ranker",
      generatedAt: new Date().toISOString(),
      recommendations: rankerResponse.recommendations,
      aiStudio: {
        intent: aiResponse.intent,
        raw: aiResponse.raw,
      },
      ranker: rankerResponse.raw,
    };
  }
}
