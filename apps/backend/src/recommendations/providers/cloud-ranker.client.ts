import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CloudRecommendation } from "@cloud-recommender/shared";
import type { EnvConfig } from "../../config/env.schema.js";
import type { AiStudioIntent } from "../schemas/recommendation.schema.js";

type RankerMetricBreakdown = {
  semantic_similarity: number;
  jaccard_index: number;
  resource_fit?: number;
  capability_score?: number;
  economy_score: number;
};

type RankerService = {
  service_id: string;
  name: string;
  description: string;
  provider_name: string;
  category?: string | null;
  price_rub: number;
  final_score_100: number;
  matched_tags: string[];
  matched_requirements?: string[];
  tech_stack: string[];
  compliance_tags: string[];
  source_url?: string | null;
  metrics_breakdown: RankerMetricBreakdown;
};

type RankerResponse = {
  user_context: Record<string, unknown>;
  top_recommendations: RankerService[];
};

@Injectable()
export class CloudRankerClient {
  private readonly logger = new Logger(CloudRankerClient.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async rank(intent: AiStudioIntent): Promise<{ recommendations: CloudRecommendation[]; raw: RankerResponse }> {
    const rankerUrl = this.config.get("RANKER_API_URL", { infer: true });
    const payload = {
      user_intent: intent,
      top_n: 7,
    };

    if (this.config.get("DEBUG_RANKER_INTENT", { infer: true })) {
      this.logger.debug(`Ranker request payload: ${JSON.stringify(payload, null, 2)}`);
    }

    const response = await fetch(`${rankerUrl}/api/v1/rank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = (await response.json().catch(() => ({}))) as RankerResponse & {
      detail?: unknown;
    };

    if (!response.ok) {
      const detail =
        typeof raw.detail === "string"
          ? raw.detail
          : raw.detail
            ? JSON.stringify(raw.detail)
            : undefined;
      throw new Error(detail ?? `Ranker request failed: ${response.status}`);
    }

    return {
      raw,
      recommendations: raw.top_recommendations.map((service) =>
        this.toCloudRecommendation(service, intent.reasoning_summary),
      ),
    };
  }

  private toCloudRecommendation(
    service: RankerService,
    reasoningSummary: string,
  ): CloudRecommendation {
    const services = [
      ...(service.tech_stack.length > 0 ? service.tech_stack : []),
      ...(service.matched_tags.length > 0 ? service.matched_tags : []),
      ...(service.category ? [service.category] : []),
    ];
    const uniqueServices = [...new Set(services)].slice(0, 5);

    return {
      id: service.service_id,
      provider: service.provider_name,
      title: service.name,
      description: service.description,
      finalScore: Math.max(0, Math.min(100, service.final_score_100)),
      services: uniqueServices.length > 0 ? uniqueServices : [service.provider_name],
      reasons: [
        reasoningSummary,
        `Ресурсное совпадение: ${service.metrics_breakdown.resource_fit ?? 0}; semantic: ${service.metrics_breakdown.semantic_similarity}; Jaccard: ${service.metrics_breakdown.jaccard_index}.`,
        ...(service.matched_requirements?.length
          ? [`Совпавшие требования: ${service.matched_requirements.slice(0, 4).join(", ")}.`]
          : []),
      ],
      risks: [
        service.source_url
          ? `Проверьте тариф и условия провайдера: ${service.source_url}`
          : "Проверьте актуальный тариф и ограничения услуги у провайдера.",
      ],
      estimatedCostLevel: this.toCostLevel(service.price_rub),
      icon: "/cloud-service.svg",
    };
  }

  private toCostLevel(priceRub: number): CloudRecommendation["estimatedCostLevel"] {
    if (priceRub < 15_000) {
      return "low";
    }
    if (priceRub < 100_000) {
      return "medium";
    }
    return "high";
  }
}
