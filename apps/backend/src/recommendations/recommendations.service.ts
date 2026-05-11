import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type {
  RecommendationHistoryItem,
  RecommendationQueueStats,
  RecommendationRequest,
} from "@cloud-recommender/shared";
import { RECOMMENDATIONS_QUEUE } from "../queue/queue.module.js";
import { createRecommendationInputSchema } from "./schemas/recommendation.schema.js";
import { RecommendationsRepository } from "./recommendations.repository.js";

export type RecommendationJob = {
  requestId: string;
  prompt: string;
};

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly repository: RecommendationsRepository,
    @InjectQueue(RECOMMENDATIONS_QUEUE) private readonly queue: Queue<RecommendationJob>,
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

  async clearHistory(): Promise<{ deleted: number }> {
    await this.queue.drain(true);
    const deleted = await this.repository.clearHistory();

    return { deleted };
  }
}
