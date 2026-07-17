import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import type {
  CloudRecommendation,
  RecommendationExplanation,
  RecommendationHistoryItem,
  RecommendationRequest,
  RecommendationStatus,
} from "@cloud-recommender/shared";
import { PG_POOL } from "../database/database.module.js";

type RequestRow = {
  id: string;
  prompt: string;
  status: RecommendationStatus;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
};

type RecommendationRow = {
  id: string;
  provider: string;
  title: string;
  description: string;
  final_score: string;
  monthly_price_rub: string | null;
  services: string[];
  reasons: string[];
  risks: string[];
  estimated_cost_level: "low" | "medium" | "high";
  icon: string;
  raw_payload: unknown;
};

export type RecommendationExplanationContext = {
  prompt: string;
  recommendation: CloudRecommendation;
  rawPayload: unknown;
};

@Injectable()
export class RecommendationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createRequest(prompt: string): Promise<RecommendationRequest> {
    const result = await this.pool.query<RequestRow>(
      `INSERT INTO recommendation_requests (prompt, status)
       VALUES ($1, 'pending')
       RETURNING *`,
      [prompt],
    );

    return this.toRequest(result.rows[0], []);
  }

  async markProcessing(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE recommendation_requests
       SET status = 'processing', updated_at = now()
       WHERE id = $1`,
      [id],
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `UPDATE recommendation_requests
       SET status = 'failed', error_message = $2, updated_at = now(), completed_at = now()
       WHERE id = $1`,
      [id, errorMessage],
    );
  }

  async saveCompleted(
    requestId: string,
    recommendations: CloudRecommendation[],
    rawPayload: unknown,
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM cloud_recommendations WHERE request_id = $1", [requestId]);

      for (const [index, recommendation] of recommendations.entries()) {
        await client.query(
          `INSERT INTO cloud_recommendations (
            request_id,
            provider,
            title,
            description,
            final_score,
            monthly_price_rub,
            services,
            reasons,
            risks,
            estimated_cost_level,
            icon,
            raw_payload
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            requestId,
            recommendation.provider,
            recommendation.title,
            recommendation.description,
            recommendation.finalScore,
            recommendation.monthlyPriceRub,
            recommendation.services,
            recommendation.reasons,
            recommendation.risks,
            recommendation.estimatedCostLevel,
            recommendation.icon,
            {
              response: rawPayload,
              serviceId: recommendation.id,
              explanation: recommendation.explanation,
              rankPosition: index,
              sourceUrl: recommendation.sourceUrl,
              serviceType: recommendation.serviceType,
              city: recommendation.city,
              priceEstimated: recommendation.priceEstimated ?? false,
            },
          ],
        );
      }

      await client.query(
        `UPDATE recommendation_requests
         SET status = 'completed', updated_at = now(), completed_at = now()
         WHERE id = $1`,
        [requestId],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<RecommendationRequest> {
    const requestResult = await this.pool.query<RequestRow>(
      `SELECT * FROM recommendation_requests WHERE id = $1`,
      [id],
    );

    const request = requestResult.rows[0];

    if (!request) {
      throw new NotFoundException(`Recommendation request ${id} was not found`);
    }

    const recommendations = await this.findRecommendations(id);
    return this.toRequest(request, recommendations);
  }

  async findHistory(): Promise<RecommendationHistoryItem[]> {
    const result = await this.pool.query<
      RequestRow & { total_recommendations: string; best_score: string | null }
    >(
      `SELECT
        rr.*,
        COUNT(cr.id) AS total_recommendations,
        MAX(cr.final_score) AS best_score
       FROM recommendation_requests rr
       LEFT JOIN cloud_recommendations cr ON cr.request_id = rr.id
       GROUP BY rr.id
       ORDER BY rr.created_at DESC
       LIMIT 20`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      totalRecommendations: Number(row.total_recommendations),
      bestScore: row.best_score === null ? null : Number(row.best_score),
    }));
  }

  async findExplanationContext(
    requestId: string,
    recommendationId: string,
  ): Promise<RecommendationExplanationContext> {
    const result = await this.pool.query<RecommendationRow & { prompt: string }>(
      `SELECT cr.*, rr.prompt
       FROM cloud_recommendations cr
       JOIN recommendation_requests rr ON rr.id = cr.request_id
       WHERE cr.request_id = $1 AND cr.id = $2`,
      [requestId, recommendationId],
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException(
        `Recommendation ${recommendationId} was not found in request ${requestId}`,
      );
    }

    return {
      prompt: row.prompt,
      recommendation: this.toCloudRecommendation(row),
      rawPayload: row.raw_payload,
    };
  }

  async saveExplanation(
    recommendationId: string,
    explanation: RecommendationExplanation,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE cloud_recommendations
       SET raw_payload = jsonb_set(raw_payload, '{explanation}', $2::jsonb, true)
       WHERE id = $1`,
      [recommendationId, JSON.stringify(explanation)],
    );
  }

  async clearHistory(): Promise<number> {
    const result = await this.pool.query<{ id: string }>(
      `DELETE FROM recommendation_requests
       RETURNING id`,
    );

    return result.rowCount ?? 0;
  }

  private async findRecommendations(requestId: string): Promise<CloudRecommendation[]> {
    const result = await this.pool.query<RecommendationRow>(
      `SELECT *
       FROM cloud_recommendations
       WHERE request_id = $1
       ORDER BY COALESCE((raw_payload->>'rankPosition')::int, 2147483647), final_score DESC`,
      [requestId],
    );

    return result.rows.map((row) => this.toCloudRecommendation(row));
  }

  private toCloudRecommendation(row: RecommendationRow): CloudRecommendation {
    return {
      id: row.id,
      provider: row.provider,
      title: row.title,
      sourceUrl: this.extractSourceUrl(row.raw_payload, row.provider),
      serviceType: this.extractServiceType(row.raw_payload),
      city: this.extractCity(row.raw_payload),
      description: row.description,
      finalScore: Number(row.final_score),
      monthlyPriceRub: row.monthly_price_rub === null ? null : Number(row.monthly_price_rub),
      priceEstimated: this.extractPriceEstimated(row.raw_payload),
      services: row.services,
      reasons: row.reasons,
      risks: row.risks,
      estimatedCostLevel: row.estimated_cost_level,
      icon: row.icon,
      explanation: this.extractExplanation(row.raw_payload),
    };
  }

  private extractSourceUrl(rawPayload: unknown, provider: string): string | null {
    if (!rawPayload || typeof rawPayload !== "object") {
      return this.providerSourceUrl(provider);
    }

    const sourceUrl = (rawPayload as { sourceUrl?: unknown }).sourceUrl;
    if (typeof sourceUrl === "string" && /^https?:\/\//i.test(sourceUrl)) {
      return sourceUrl;
    }

    return this.providerSourceUrl(provider);
  }

  private extractServiceType(rawPayload: unknown): string | null {
    if (!rawPayload || typeof rawPayload !== "object") {
      return null;
    }

    const serviceType = (rawPayload as { serviceType?: unknown }).serviceType;
    return typeof serviceType === "string" && serviceType.length > 0 ? serviceType : null;
  }

  private extractCity(rawPayload: unknown): string | null {
    if (!rawPayload || typeof rawPayload !== "object") {
      return null;
    }

    const city = (rawPayload as { city?: unknown }).city;
    return typeof city === "string" && city.length > 0 ? city : null;
  }

  private extractPriceEstimated(rawPayload: unknown): boolean {
    if (!rawPayload || typeof rawPayload !== "object") {
      return false;
    }

    return (rawPayload as { priceEstimated?: unknown }).priceEstimated === true;
  }

  private providerSourceUrl(provider: string): string | null {
    const normalized = provider.toLowerCase().replace(/[\s._-]+/g, "");

    if (normalized.includes("selectel")) {
      return "https://selectel.ru/prices/";
    }
    if (normalized.includes("vkcloud") || normalized === "vk") {
      return "https://cloud.vk.com/pricing/";
    }
    if (normalized.includes("t1cloud") || normalized.includes("t1")) {
      return "https://t1-cloud.ru/documents/rates";
    }
    if (normalized.includes("edgecenter")) {
      return "https://edgecenter.ru/cloud/price";
    }
    if (normalized.includes("yandexcloud")) {
      return "https://yandex.cloud/ru/price-list";
    }
    if (normalized.includes("cloudru")) {
      return "https://cloud.ru/services";
    }

    return null;
  }

  private extractExplanation(rawPayload: unknown): CloudRecommendation["explanation"] {
    if (!rawPayload || typeof rawPayload !== "object") {
      return undefined;
    }

    const explanation = (rawPayload as { explanation?: unknown }).explanation;
    if (!explanation || typeof explanation !== "object") {
      return undefined;
    }

    return explanation as CloudRecommendation["explanation"];
  }

  private toRequest(
    row: RequestRow | undefined,
    recommendations: CloudRecommendation[],
  ): RecommendationRequest {
    if (!row) {
      throw new Error("Expected request row to exist");
    }

    return {
      id: row.id,
      prompt: row.prompt,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
      errorMessage: row.error_message,
      serviceTypes: this.uniqueServiceTypes(recommendations),
      recommendations,
    };
  }

  private uniqueServiceTypes(recommendations: CloudRecommendation[]): string[] {
    return recommendations.reduce<string[]>((serviceTypes, recommendation) => {
      if (recommendation.serviceType && !serviceTypes.includes(recommendation.serviceType)) {
        serviceTypes.push(recommendation.serviceType);
      }

      return serviceTypes;
    }, []);
  }
}
