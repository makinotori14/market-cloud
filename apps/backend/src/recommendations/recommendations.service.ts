import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type {
  CloudRecommendation,
  RecommendationExplanation,
  RecommendationHistoryItem,
  RecommendationQueueStats,
  RecommendationRequest,
} from "@cloud-recommender/shared";
import { RECOMMENDATIONS_QUEUE } from "../queue/queue.module.js";
import { createRecommendationInputSchema } from "./schemas/recommendation.schema.js";
import { RecommendationsRepository } from "./recommendations.repository.js";
import { LlmExplanationClient } from "./providers/yandex-explanation-agent.client.js";
import type { RankerService } from "./providers/cloud-ranker.client.js";

export type RecommendationJob = {
  requestId: string;
  prompt: string;
};

@Injectable()
export class RecommendationsService {
  private readonly explanationJobs = new Map<string, Promise<RecommendationExplanation>>();

  constructor(
    private readonly repository: RecommendationsRepository,
    @InjectQueue(RECOMMENDATIONS_QUEUE) private readonly queue: Queue<RecommendationJob>,
    private readonly explanationClient: LlmExplanationClient,
  ) {}

  async create(input: unknown): Promise<RecommendationRequest> {
    const parsed = createRecommendationInputSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const request = await this.repository.createRequest(parsed.data.prompt);

    await this.queue.add(
      "score-cloud-solutions",
      {
        requestId: request.id,
        prompt: request.prompt,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    return request;
  }

  async findById(id: string): Promise<RecommendationRequest> {
    return this.repository.findById(id);
  }

  async findHistory(): Promise<RecommendationHistoryItem[]> {
    return this.repository.findHistory();
  }

  async getQueueStats(): Promise<RecommendationQueueStats> {
    const counts = await this.queue.getJobCounts("waiting", "active", "delayed");
    const waiting = counts.waiting ?? 0;
    const active = counts.active ?? 0;
    const delayed = counts.delayed ?? 0;

    return {
      waiting,
      active,
      delayed,
      queued: waiting + active + delayed,
    };
  }

  async explainRecommendation(
    requestId: string,
    recommendationId: string,
  ): Promise<RecommendationExplanation> {
    const jobKey = `${requestId}:${recommendationId}`;
    const existingJob = this.explanationJobs.get(jobKey);
    if (existingJob) {
      return existingJob;
    }

    const job = this.generateExplanation(requestId, recommendationId);
    this.explanationJobs.set(jobKey, job);

    try {
      return await job;
    } finally {
      if (this.explanationJobs.get(jobKey) === job) {
        this.explanationJobs.delete(jobKey);
      }
    }
  }

  async clearHistory(): Promise<{ deleted: number }> {
    await this.queue.drain(true);
    const deleted = await this.repository.clearHistory();

    return { deleted };
  }

  private async generateExplanation(
    requestId: string,
    recommendationId: string,
  ): Promise<RecommendationExplanation> {
    const context = await this.repository.findExplanationContext(requestId, recommendationId);
    if (context.recommendation.explanation) {
      return context.recommendation.explanation;
    }

    const serviceId = this.extractServiceId(context.rawPayload) ?? context.recommendation.id;
    const service = this.extractRankerService(context.rawPayload, serviceId);
    const userProfile = this.extractUserProfile(context.rawPayload) ?? {
      user_prompt: context.prompt,
    };
    const recommendationForLlm: CloudRecommendation = {
      ...context.recommendation,
      id: serviceId,
    };
    const [explained] = await this.explanationClient.explainRecommendations(
      userProfile,
      service ? [service] : [],
      [recommendationForLlm],
    );
    const explanation = explained?.explanation;

    if (!explanation) {
      throw new Error(`Failed to build explanation for recommendation ${recommendationId}`);
    }

    await this.repository.saveExplanation(recommendationId, explanation);
    return explanation;
  }

  private extractServiceId(rawPayload: unknown): string | null {
    const payload = this.asRecord(rawPayload);
    return typeof payload?.serviceId === "string" ? payload.serviceId : null;
  }

  private extractUserProfile(rawPayload: unknown): unknown | null {
    const payload = this.asRecord(rawPayload);
    const response = this.asRecord(payload?.response);
    const aiStudio = this.asRecord(response?.aiStudio);
    const raw = this.asRecord(aiStudio?.raw);
    return raw?.extraction ?? null;
  }

  private extractRankerService(rawPayload: unknown, serviceId: string): RankerService | null {
    const payload = this.asRecord(rawPayload);
    const response = this.asRecord(payload?.response);
    const ranker = this.asRecord(response?.ranker);
    const services = ranker?.top_recommendations;

    if (!Array.isArray(services)) {
      return null;
    }

    return (services as RankerService[]).find((service) => service.service_id === serviceId) ?? null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object"
      ? value as Record<string, unknown>
      : null;
  }
}
