import { ApiProperty } from "@nestjs/swagger";

export class CreateRecommendationDto {
  @ApiProperty({
    example: "Нужна облачная архитектура для e-commerce с автоскейлингом, CDN и аналитикой.",
    minLength: 8,
    maxLength: 3000,
  })
  prompt!: string;
}
