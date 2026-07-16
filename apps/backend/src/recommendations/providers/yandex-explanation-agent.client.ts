import { Injectable, Logger } from "@nestjs/common";
import type { CloudRecommendation, RecommendationExplanation } from "@cloud-recommender/shared";
import {
  batchExplanationAgentOutputSchema,
  type AiStudioIntent,
  type ExplanationAgentOutput,
  type ExtractionAgentOutput,
} from "../schemas/recommendation.schema.js";
import type { RankerService } from "./cloud-ranker.client.js";
import {
  batchExplanationJsonSchema,
  explanationSystemPrompt,
} from "./llm-prompts.js";
import { OpenAiCompatibleClient } from "./openai-compatible.client.js";

@Injectable()
export class LlmExplanationClient {
  private readonly logger = new Logger(LlmExplanationClient.name);

  constructor(private readonly llm: OpenAiCompatibleClient) {}

  async explainRecommendations(
    userProfile: ExtractionAgentOutput | AiStudioIntent,
    services: RankerService[],
    recommendations: CloudRecommendation[],
  ): Promise<CloudRecommendation[]> {
    if (recommendations.length === 0) {
      return recommendations;
    }

    const servicesById = new Map(services.map((service) => [service.service_id, service]));

    try {
      const completion = await this.llm.completeJson<unknown>({
        schemaName: "cloud_service_explanations",
        schema: batchExplanationJsonSchema,
        systemPrompt: explanationSystemPrompt,
        input: JSON.stringify({
          user_profile: userProfile,
          services: recommendations.map((recommendation) => {
            const service = servicesById.get(recommendation.id);
            return {
              service_id: recommendation.id,
              provider: recommendation.provider,
              name: recommendation.title,
              description: recommendation.description.slice(0, 600),
              category: service?.category ?? null,
              service_type: service?.service_type ?? recommendation.serviceType ?? null,
              city: service?.city ?? recommendation.city ?? null,
              monthly_price_rub: recommendation.monthlyPriceRub,
              score: recommendation.finalScore,
              matched_tags: service?.matched_tags.slice(0, 8) ?? [],
              matched_requirements: service?.matched_requirements?.slice(0, 8) ?? [],
              tech_stack: service?.tech_stack.slice(0, 8) ?? recommendation.services.slice(0, 8),
              compliance_tags: service?.compliance_tags.slice(0, 8) ?? [],
              deterministic_reasons: recommendation.reasons.slice(0, 5),
              known_risks: recommendation.risks.slice(0, 3),
            };
          }),
        }),
      });

      const parsed = batchExplanationAgentOutputSchema.parse(completion.value);
      const explanationsById = new Map(
        parsed.explanations.map((explanation) => [explanation.service_id, explanation]),
      );

      return recommendations.map((recommendation) => {
        const output = explanationsById.get(recommendation.id);
        const explanation = output
          ? this.toRecommendationExplanation(output)
          : this.fallbackExplanation(recommendation);

        return {
          ...recommendation,
          explanation,
          reasons: explanation.keyMatches.length > 0 ? explanation.keyMatches : recommendation.reasons,
        };
      });
    } catch (error) {
      this.logger.warn(
        `Failed to generate batch explanations: ${error instanceof Error ? error.message : String(error)}`,
      );

      return recommendations.map((recommendation) => ({
        ...recommendation,
        explanation: this.fallbackExplanation(recommendation),
      }));
    }
  }

  private toRecommendationExplanation(output: ExplanationAgentOutput): RecommendationExplanation {
    return {
      shortExplanation: output.short_explanation,
      detailedExplanation: output.detailed_explanation,
      keyMatches: output.key_matches,
      riskMitigation: output.risk_mitigation,
      budgetAnalysis: output.budget_analysis,
    };
  }

  private fallbackExplanation(recommendation: CloudRecommendation): RecommendationExplanation {
    return {
      shortExplanation: recommendation.reasons[0] ?? recommendation.description,
      detailedExplanation: [
        recommendation.description,
        recommendation.reasons.join(" "),
        recommendation.risks.join(" "),
      ]
        .filter(Boolean)
        .join("\n\n"),
      keyMatches: recommendation.reasons.slice(0, 5),
      riskMitigation: recommendation.risks[0] ?? null,
      budgetAnalysis: recommendation.monthlyPriceRub === null
        ? "Бюджет не указан, поэтому сервис стоит дополнительно сверить с актуальной тарифной моделью провайдера."
        : `Ориентировочная стоимость составляет ${new Intl.NumberFormat("ru-RU").format(recommendation.monthlyPriceRub)} ₽/мес.`,
    };
  }
}
