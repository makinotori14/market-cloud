import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Job } from "bullmq";
import type { EnvConfig } from "../../config/env.schema.js";
import { RECOMMENDATIONS_QUEUE } from "../../queue/queue.module.js";
import { RecommendationsRepository } from "../recommendations.repository.js";
import type { RecommendationJob } from "../recommendations.service.js";
import { YandexCloudStub } from "../providers/yandex-cloud.stub.js";
import { LiveRecommendationEngine } from "../providers/live-recommendation.engine.js";
import { sortByFinalScore } from "../providers/score-sorter.js";
import { yandexCloudStubResponseSchema } from "../schemas/recommendation.schema.js";

@Injectable()
@Processor(RECOMMENDATIONS_QUEUE)
export class RecommendationProcessor extends WorkerHost {
  private readonly yandexCloud = new YandexCloudStub();

  constructor(
    private readonly repository: RecommendationsRepository,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly liveRecommendationEngine: LiveRecommendationEngine,
  ) {
    super();
  }

  async process(job: Job<RecommendationJob>): Promise<void> {
    const { requestId, prompt } = job.data;

    try {
      await this.repository.markProcessing(requestId);
      const response =
        this.config.get("YANDEX_CLOUD_API_MODE", { infer: true }) === "live"
          ? await this.liveRecommendationEngine.getRecommendations(prompt)
          : await this.yandexCloud.getRecommendations(prompt);
      const parsed = yandexCloudStubResponseSchema.parse(response);
      const recommendations = response.model.includes("sentence-bert-ranker")
        ? parsed.recommendations
        : sortByFinalScore(parsed.recommendations);

      await this.repository.saveCompleted(requestId, recommendations, parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown recommendation error";
      await this.repository.markFailed(requestId, message);
      throw error;
    }
  }
}
