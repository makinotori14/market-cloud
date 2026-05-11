var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from "@nestjs/common";
import { CloudRankerClient } from "./cloud-ranker.client.js";
import { YandexAiStudioClient } from "./yandex-ai-studio.client.js";
let LiveRecommendationEngine = class LiveRecommendationEngine {
    aiStudio;
    ranker;
    constructor(aiStudio, ranker) {
        this.aiStudio = aiStudio;
        this.ranker = ranker;
    }
    async getRecommendations(prompt) {
        const aiResponse = await this.aiStudio.extractIntent(prompt);
        const rankerResponse = await this.ranker.rank(aiResponse.intent);
        return {
            model: "yandex-ai-studio/responses + sentence-bert-ranker",
            generatedAt: new Date().toISOString(),
            recommendations: rankerResponse.recommendations,
            aiStudio: {
                intent: aiResponse.intent,
                raw: aiResponse.raw,
            },
            ranker: rankerResponse.raw,
        };
    }
};
LiveRecommendationEngine = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [YandexAiStudioClient,
        CloudRankerClient])
], LiveRecommendationEngine);
export { LiveRecommendationEngine };
//# sourceMappingURL=live-recommendation.engine.js.map