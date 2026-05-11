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
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CreateRecommendationDto } from "./dto/create-recommendation.dto.js";
import { RecommendationHistoryItemDto, RecommendationQueueStatsDto, RecommendationRequestDto, ClearHistoryResponseDto, } from "./dto/recommendation-response.dto.js";
import { RecommendationsService } from "./recommendations.service.js";
let RecommendationsController = class RecommendationsController {
    recommendationsService;
    constructor(recommendationsService) {
        this.recommendationsService = recommendationsService;
    }
    create(body) {
        return this.recommendationsService.create(body);
    }
    findHistory() {
        return this.recommendationsService.findHistory();
    }
    getStats() {
        return this.recommendationsService.getQueueStats();
    }
    clearHistory() {
        return this.recommendationsService.clearHistory();
    }
    clearHistoryFallback() {
        return this.recommendationsService.clearHistory();
    }
    findById(id) {
        return this.recommendationsService.findById(id);
    }
};
__decorate([
    Post(),
    ApiCreatedResponse({ type: RecommendationRequestDto }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateRecommendationDto]),
    __metadata("design:returntype", void 0)
], RecommendationsController.prototype, "create", null);
__decorate([
    Get(),
    ApiOkResponse({ type: [RecommendationHistoryItemDto] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecommendationsController.prototype, "findHistory", null);
__decorate([
    Get("meta/stats"),
    ApiOkResponse({ type: RecommendationQueueStatsDto }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecommendationsController.prototype, "getStats", null);
__decorate([
    Delete(),
    ApiOkResponse({ type: ClearHistoryResponseDto }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecommendationsController.prototype, "clearHistory", null);
__decorate([
    Post("clear"),
    ApiOkResponse({ type: ClearHistoryResponseDto }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecommendationsController.prototype, "clearHistoryFallback", null);
__decorate([
    Get(":id"),
    ApiOkResponse({ type: RecommendationRequestDto }),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecommendationsController.prototype, "findById", null);
RecommendationsController = __decorate([
    ApiTags("recommendations"),
    Controller("recommendations"),
    __metadata("design:paramtypes", [RecommendationsService])
], RecommendationsController);
export { RecommendationsController };
//# sourceMappingURL=recommendations.controller.js.map