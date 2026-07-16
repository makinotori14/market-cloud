import { Injectable } from "@nestjs/common";
import { CloudRankerClient } from "./cloud-ranker.client.js";
import { LlmExtractionClient } from "./yandex-ai-studio.client.js";
import { LlmExplanationClient } from "./yandex-explanation-agent.client.js";
import type { YandexCloudStubResponse } from "../schemas/recommendation.schema.js";

@Injectable()
export class LiveRecommendationEngine {
  constructor(
    private readonly extractionClient: LlmExtractionClient,
    private readonly ranker: CloudRankerClient,
    private readonly explanationClient: LlmExplanationClient,
  ) {}

  async getRecommendations(prompt: string): Promise<YandexCloudStubResponse> {
    const aiResponse = await this.extractionClient.extractIntent(prompt);
    const rankerResponse = await this.ranker.rank(aiResponse.intent);
    const recommendations = await this.explanationClient.explainRecommendations(
      aiResponse.extraction,
      rankerResponse.raw.top_recommendations,
      rankerResponse.recommendations,
    );

    return {
      model: "openai-compatible/extraction + sentence-bert-ranker + batch-explanation",
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
