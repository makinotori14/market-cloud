var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PG_POOL } from "../database/database.module.js";
let RecommendationsRepository = class RecommendationsRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createRequest(prompt) {
        const result = await this.pool.query(`INSERT INTO recommendation_requests (prompt, status)
       VALUES ($1, 'pending')
       RETURNING *`, [prompt]);
        return this.toRequest(result.rows[0], []);
    }
    async markProcessing(id) {
        await this.pool.query(`UPDATE recommendation_requests
       SET status = 'processing', updated_at = now()
       WHERE id = $1`, [id]);
    }
    async markFailed(id, errorMessage) {
        await this.pool.query(`UPDATE recommendation_requests
       SET status = 'failed', error_message = $2, updated_at = now(), completed_at = now()
       WHERE id = $1`, [id, errorMessage]);
    }
    async saveCompleted(requestId, recommendations, rawPayload) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM cloud_recommendations WHERE request_id = $1", [requestId]);
            for (const recommendation of recommendations) {
                await client.query(`INSERT INTO cloud_recommendations (
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
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
                ]);
            }
            await client.query(`UPDATE recommendation_requests
         SET status = 'completed', updated_at = now(), completed_at = now()
         WHERE id = $1`, [requestId]);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async findById(id) {
        const requestResult = await this.pool.query(`SELECT * FROM recommendation_requests WHERE id = $1`, [id]);
        const request = requestResult.rows[0];
        if (!request) {
            throw new NotFoundException(`Recommendation request ${id} was not found`);
        }
        const recommendations = await this.findRecommendations(id);
        return this.toRequest(request, recommendations);
    }
    async findHistory() {
        const result = await this.pool.query(`SELECT
        rr.*,
        COUNT(cr.id) AS total_recommendations,
        MAX(cr.final_score) AS best_score
       FROM recommendation_requests rr
       LEFT JOIN cloud_recommendations cr ON cr.request_id = rr.id
       GROUP BY rr.id
       ORDER BY rr.created_at DESC
       LIMIT 20`);
        return result.rows.map((row) => ({
            id: row.id,
            prompt: row.prompt,
            status: row.status,
            createdAt: row.created_at.toISOString(),
            totalRecommendations: Number(row.total_recommendations),
            bestScore: row.best_score === null ? null : Number(row.best_score),
        }));
    }
    async clearHistory() {
        const result = await this.pool.query(`DELETE FROM recommendation_requests
       RETURNING id`);
        return result.rowCount ?? 0;
    }
    async findRecommendations(requestId) {
        const result = await this.pool.query(`SELECT *
       FROM cloud_recommendations
       WHERE request_id = $1
       ORDER BY final_score DESC`, [requestId]);
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
    toRequest(row, recommendations) {
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
};
RecommendationsRepository = __decorate([
    Injectable(),
    __param(0, Inject(PG_POOL)),
    __metadata("design:paramtypes", [Function])
], RecommendationsRepository);
export { RecommendationsRepository };
//# sourceMappingURL=recommendations.repository.js.map