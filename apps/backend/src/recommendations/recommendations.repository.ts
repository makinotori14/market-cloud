import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import type {
  CloudRecommendation,
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
  services: string[];
  reasons: string[];
  risks: string[];
  estimated_cost_level: "low" | "medium" | "high";
  icon: string;
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

      for (const recommendation of recommendations) {
        await client.query(
          `INSERT INTO cloud_recommendations (
            request_id,
            provider,
            title,
            description,
            final_score,
            services,
            reasons,
            risks,
            estimated_cost_level,
            icon,
            raw_payload
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            requestId,
            recommendation.provider,
            recommendation.title,
            recommendation.description,
            recommendation.finalScore,
            recommendation.services,
            recommendation.reasons,
            recommendation.risks,
            recommendation.estimatedCostLevel,
            recommendation.icon,
            rawPayload,
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
       ORDER BY final_score DESC`,
      [requestId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      title: row.title,
      description: row.description,
      finalScore: Number(row.final_score),
      services: row.services,
      reasons: row.reasons,
      risks: row.risks,
      estimatedCostLevel: row.estimated_cost_level,
      icon: row.icon,
    }));
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
      recommendations,
    };
  }
}
