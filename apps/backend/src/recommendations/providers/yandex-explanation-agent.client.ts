import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CloudRecommendation, RecommendationExplanation } from "@cloud-recommender/shared";
import type { EnvConfig } from "../../config/env.schema.js";
import {
  explanationAgentOutputSchema,
  type AiStudioIntent,
  type ExplanationAgentOutput,
  type ExtractionAgentOutput,
} from "../schemas/recommendation.schema.js";
import type { RankerService } from "./cloud-ranker.client.js";

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

@Injectable()
export class YandexExplanationAgentClient {
  private readonly logger = new Logger(YandexExplanationAgentClient.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async explainRecommendations(
    userProfile: ExtractionAgentOutput | AiStudioIntent,
    services: RankerService[],
    recommendations: CloudRecommendation[],
  ): Promise<CloudRecommendation[]> {
    const byId = new Map(services.map((service) => [service.service_id, service]));

    return Promise.all(
      recommendations.map(async (recommendation) => {
        const service = byId.get(recommendation.id);
        const explanation = service
          ? await this.explainOne(userProfile, service, recommendation)
          : this.fallbackExplanation(recommendation);

        return {
          ...recommendation,
          explanation,
          reasons: explanation.keyMatches.length > 0 ? explanation.keyMatches : recommendation.reasons,
        };
      }),
    );
  }

  private async explainOne(
    userProfile: ExtractionAgentOutput | AiStudioIntent,
    service: RankerService,
    recommendation: CloudRecommendation,
  ): Promise<RecommendationExplanation> {
    try {
      const apiKey = this.config.get("YANDEX_AI_STUDIO_API_KEY", { infer: true });
      const promptId = this.config.get("YANDEX_AI_STUDIO_EXPLANATION_PROMPT_ID", { infer: true });
      const projectId = this.config.get("YANDEX_AI_STUDIO_PROJECT_ID", { infer: true });
      const baseUrl = this.config.get("YANDEX_AI_STUDIO_BASE_URL", { infer: true });

      const missing = [
        ["YANDEX_AI_STUDIO_API_KEY", apiKey],
        ["YANDEX_AI_STUDIO_EXPLANATION_PROMPT_ID", promptId],
        ["YANDEX_AI_STUDIO_PROJECT_ID", projectId],
      ]
        .filter(([, value]) => !value)
        .map(([name]) => name);

      if (missing.length > 0) {
        throw new Error(`Missing explanation agent env vars: ${missing.join(", ")}`);
      }

      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey as string}`,
          "Content-Type": "application/json",
          "OpenAI-Project": projectId as string,
        },
        body: JSON.stringify({
          prompt: {
            id: promptId as string,
          },
          input: JSON.stringify(
            {
              user_profile: userProfile,
              service_data: {
                ...service,
                price_from_rub: service.price_rub,
                total_score: service.final_score_100,
                tech_tags: service.tech_stack,
              },
            },
            null,
            2,
          ),
        }),
      });

      const raw = (await response.json().catch(() => ({}))) as ResponsesApiPayload & {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(raw.error?.message ?? `Explanation agent request failed: ${response.status}`);
      }

      return this.toRecommendationExplanation(
        explanationAgentOutputSchema.parse(JSON.parse(this.stripJsonFence(this.extractOutputText(raw)))),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to explain ${service.service_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.fallbackExplanation(recommendation);
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

  private extractOutputText(payload: ResponsesApiPayload): string {
    if (payload.output_text) {
      return payload.output_text;
    }

    const outputText = (payload.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text))
      .join("\n")
      .trim();

    if (!outputText) {
      throw new Error("Explanation agent response does not contain output_text");
    }

    return outputText;
  }

  private stripJsonFence(value: string): string {
    return value
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }
}
