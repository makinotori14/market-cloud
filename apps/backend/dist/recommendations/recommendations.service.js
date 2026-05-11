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
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { RECOMMENDATIONS_QUEUE } from "../queue/queue.module.js";
import { createRecommendationInputSchema } from "./schemas/recommendation.schema.js";
import { RecommendationsRepository } from "./recommendations.repository.js";
let RecommendationsService = class RecommendationsService {
    repository;
    queue;
    constructor(repository, queue) {
        this.repository = repository;
        this.queue = queue;
    }
    async create(input) {
        const parsed = createRecommendationInputSchema.safeParse(input);
        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }
        const request = await this.repository.createRequest(parsed.data.prompt);
        await this.queue.add("score-cloud-solutions", {
            requestId: request.id,
            prompt: request.prompt,
        }, {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 100,
        });
        return request;
    }
    async findById(id) {
        return this.repository.findById(id);
    }
    async findHistory() {
        return this.repository.findHistory();
    }
    async getQueueStats() {
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
    async clearHistory() {
        await this.queue.drain(true);
        const deleted = await this.repository.clearHistory();
        return { deleted };
    }
};
RecommendationsService = __decorate([
    Injectable(),
    __param(1, InjectQueue(RECOMMENDATIONS_QUEUE)),
    __metadata("design:paramtypes", [RecommendationsRepository, Function])
], RecommendationsService);
export { RecommendationsService };
//# sourceMappingURL=recommendations.service.js.map