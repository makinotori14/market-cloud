import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CreateRecommendationDto } from "./dto/create-recommendation.dto.js";
import {
  RecommendationHistoryItemDto,
  RecommendationQueueStatsDto,
  RecommendationRequestDto,
  RecommendationExplanationDto,
  ClearHistoryResponseDto,
} from "./dto/recommendation-response.dto.js";
import { RecommendationsService } from "./recommendations.service.js";

@ApiTags("recommendations")
@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  @ApiCreatedResponse({ type: RecommendationRequestDto })
  create(@Body() body: CreateRecommendationDto) {
    return this.recommendationsService.create(body);
  }

  @Get()
  @ApiOkResponse({ type: [RecommendationHistoryItemDto] })
  findHistory() {
    return this.recommendationsService.findHistory();
  }

  @Get("meta/stats")
  @ApiOkResponse({ type: RecommendationQueueStatsDto })
  getStats() {
    return this.recommendationsService.getQueueStats();
  }

  @Post(":requestId/recommendations/:recommendationId/explanation")
  @ApiOkResponse({ type: RecommendationExplanationDto })
  explainRecommendation(
    @Param("requestId") requestId: string,
    @Param("recommendationId") recommendationId: string,
  ) {
    return this.recommendationsService.explainRecommendation(requestId, recommendationId);
  }

  @Delete()
  @ApiOkResponse({ type: ClearHistoryResponseDto })
  clearHistory() {
    return this.recommendationsService.clearHistory();
  }

  @Post("clear")
  @ApiOkResponse({ type: ClearHistoryResponseDto })
  clearHistoryFallback() {
    return this.recommendationsService.clearHistory();
  }

  @Get(":id")
  @ApiOkResponse({ type: RecommendationRequestDto })
  findById(@Param("id") id: string) {
    return this.recommendationsService.findById(id);
  }
}
