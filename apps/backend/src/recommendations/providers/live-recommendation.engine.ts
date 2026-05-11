import { Injectable } from "@nestjs/common";
import { CloudRankerClient } from "./cloud-ranker.client.js";
import { YandexAiStudioClient } from "./yandex-ai-studio.client.js";
import { YandexExplanationAgentClient } from "./yandex-explanation-agent.client.js";
import type { YandexCloudStubResponse } from "../schemas/recommendation.schema.js";

@Injectable()
export class LiveRecommendationEngine {
  constructor(
    private readonly aiStudio: YandexAiStudioClient,
    private readonly ranker: CloudRankerClient,
    private readonly explanationAgent: YandexExplanationAgentClient,
  ) {}

  async getRecommendations(prompt: string): Promise<YandexCloudStubResponse> {
    const aiResponse = await this.aiStudio.extractIntent(prompt);
    const rankerResponse = await this.ranker.rank(aiResponse.intent);
    const recommendations = await this.explanationAgent.explainRecommendations(
      aiResponse.extraction,
      rankerResponse.raw.top_recommendations,
      rankerResponse.recommendations,
    );

    return {
      model: "yandex-ai-studio/extraction-agent + sentence-bert-ranker + explanation-agent",
      generatedAt: new Date().toISOString(),
      recommendations,
      aiStudio: {
        intent: aiResponse.intent,
        raw: aiResponse.raw,
      },
      ranker: rankerResponse.raw,
    };
  }
}
