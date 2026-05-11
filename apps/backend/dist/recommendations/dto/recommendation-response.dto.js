var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
export class CloudRecommendationDto {
    id;
    provider;
    title;
    description;
    finalScore;
    services;
    reasons;
    risks;
    estimatedCostLevel;
    icon;
}
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], CloudRecommendationDto.prototype, "id", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], CloudRecommendationDto.prototype, "provider", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], CloudRecommendationDto.prototype, "title", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], CloudRecommendationDto.prototype, "description", void 0);
__decorate([
    ApiProperty({ minimum: 0, maximum: 100 }),
    __metadata("design:type", Number)
], CloudRecommendationDto.prototype, "finalScore", void 0);
__decorate([
    ApiProperty({ type: [String] }),
    __metadata("design:type", Array)
], CloudRecommendationDto.prototype, "services", void 0);
__decorate([
    ApiProperty({ type: [String] }),
    __metadata("design:type", Array)
], CloudRecommendationDto.prototype, "reasons", void 0);
__decorate([
    ApiProperty({ type: [String] }),
    __metadata("design:type", Array)
], CloudRecommendationDto.prototype, "risks", void 0);
__decorate([
    ApiProperty({ enum: ["low", "medium", "high"] }),
    __metadata("design:type", String)
], CloudRecommendationDto.prototype, "estimatedCostLevel", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], CloudRecommendationDto.prototype, "icon", void 0);
export class RecommendationRequestDto {
    id;
    prompt;
    status;
    createdAt;
    updatedAt;
    completedAt;
    errorMessage;
    recommendations;
}
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationRequestDto.prototype, "id", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationRequestDto.prototype, "prompt", void 0);
__decorate([
    ApiProperty({ enum: ["pending", "processing", "completed", "failed"] }),
    __metadata("design:type", String)
], RecommendationRequestDto.prototype, "status", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationRequestDto.prototype, "createdAt", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationRequestDto.prototype, "updatedAt", void 0);
__decorate([
    ApiPropertyOptional({ nullable: true }),
    __metadata("design:type", Object)
], RecommendationRequestDto.prototype, "completedAt", void 0);
__decorate([
    ApiPropertyOptional({ nullable: true }),
    __metadata("design:type", Object)
], RecommendationRequestDto.prototype, "errorMessage", void 0);
__decorate([
    ApiProperty({ type: [CloudRecommendationDto] }),
    __metadata("design:type", Array)
], RecommendationRequestDto.prototype, "recommendations", void 0);
export class RecommendationHistoryItemDto {
    id;
    prompt;
    status;
    createdAt;
    totalRecommendations;
    bestScore;
}
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationHistoryItemDto.prototype, "id", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationHistoryItemDto.prototype, "prompt", void 0);
__decorate([
    ApiProperty({ enum: ["pending", "processing", "completed", "failed"] }),
    __metadata("design:type", String)
], RecommendationHistoryItemDto.prototype, "status", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", String)
], RecommendationHistoryItemDto.prototype, "createdAt", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", Number)
], RecommendationHistoryItemDto.prototype, "totalRecommendations", void 0);
__decorate([
    ApiPropertyOptional({ nullable: true }),
    __metadata("design:type", Object)
], RecommendationHistoryItemDto.prototype, "bestScore", void 0);
export class RecommendationQueueStatsDto {
    queued;
    waiting;
    active;
    delayed;
}
__decorate([
    ApiProperty(),
    __metadata("design:type", Number)
], RecommendationQueueStatsDto.prototype, "queued", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", Number)
], RecommendationQueueStatsDto.prototype, "waiting", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", Number)
], RecommendationQueueStatsDto.prototype, "active", void 0);
__decorate([
    ApiProperty(),
    __metadata("design:type", Number)
], RecommendationQueueStatsDto.prototype, "delayed", void 0);
export class ClearHistoryResponseDto {
    deleted;
}
__decorate([
    ApiProperty(),
    __metadata("design:type", Number)
], ClearHistoryResponseDto.prototype, "deleted", void 0);
//# sourceMappingURL=recommendation-response.dto.js.map