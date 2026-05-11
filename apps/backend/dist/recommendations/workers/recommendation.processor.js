var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RECOMMENDATIONS_QUEUE } from "../../queue/queue.module.js";
import { RecommendationsRepository } from "../recommendations.repository.js";
import { YandexCloudStub } from "../providers/yandex-cloud.stub.js";
import { LiveRecommendationEngine } from "../providers/live-recommendation.engine.js";
import { sortByFinalScore } from "../providers/score-sorter.js";
import { yandexCloudStubResponseSchema } from "../schemas/recommendation.schema.js";
let RecommendationProcessor = class RecommendationProcessor extends WorkerHost {
    repository;
    config;
    liveRecommendationEngine;
    yandexCloud = new YandexCloudStub();
    constructor(repository, config, liveRecommendationEngine) {
        super();
        this.repository = repository;
        this.config = config;
        this.liveRecommendationEngine = liveRecommendationEngine;
    }
    async process(job) {
        const { requestId, prompt } = job.data;
        try {
            await this.repository.markProcessing(requestId);
            const response = this.config.get("YANDEX_CLOUD_API_MODE", { infer: true }) === "live"
                ? await this.liveRecommendationEngine.getRecommendations(prompt)
                : await this.yandexCloud.getRecommendations(prompt);
            const parsed = yandexCloudStubResponseSchema.parse(response);
            const sorted = sortByFinalScore(parsed.recommendations);
            await this.repository.saveCompleted(requestId, sorted, parsed);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown recommendation error";
            await this.repository.markFailed(requestId, message);
            throw error;
        }
    }
};
RecommendationProcessor = __decorate([
    Injectable(),
    Processor(RECOMMENDATIONS_QUEUE),
    __metadata("design:paramtypes", [RecommendationsRepository,
        ConfigService,
        LiveRecommendationEngine])
], RecommendationProcessor);
export { RecommendationProcessor };
//# sourceMappingURL=recommendation.processor.js.map