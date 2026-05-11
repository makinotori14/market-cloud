import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CloudRecommendationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  finalScore!: number;

  @ApiProperty({ type: [String] })
  services!: string[];

  @ApiProperty({ type: [String] })
  reasons!: string[];

  @ApiProperty({ type: [String] })
  risks!: string[];

  @ApiProperty({ enum: ["low", "medium", "high"] })
  estimatedCostLevel!: "low" | "medium" | "high";

  @ApiProperty()
  icon!: string;
}

export class RecommendationRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  prompt!: string;

  @ApiProperty({ enum: ["pending", "processing", "completed", "failed"] })
  status!: "pending" | "processing" | "completed" | "failed";

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ type: [CloudRecommendationDto] })
  recommendations!: CloudRecommendationDto[];
}

export class RecommendationHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  prompt!: string;

  @ApiProperty({ enum: ["pending", "processing", "completed", "failed"] })
  status!: "pending" | "processing" | "completed" | "failed";

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  totalRecommendations!: number;

  @ApiPropertyOptional({ nullable: true })
  bestScore!: number | null;
}

export class RecommendationQueueStatsDto {
  @ApiProperty()
  queued!: number;

  @ApiProperty()
  waiting!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  delayed!: number;
}

export class ClearHistoryResponseDto {
  @ApiProperty()
  deleted!: number;
}
