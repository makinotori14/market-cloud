import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CloudRecommendation } from "@cloud-recommender/shared";
import type { EnvConfig } from "../../config/env.schema.js";
import type { AiStudioIntent } from "../schemas/recommendation.schema.js";

export type RankerMetricBreakdown = {
  semantic_similarity: number;
  jaccard_index: number;
  resource_fit?: number;
  capability_score?: number;
  city_preference?: number;
  economy_score: number;
};

export type RankerService = {
  service_id: string;
  name: string;
  description: string;
  provider_name: string;
  category?: string | null;
  service_type?: string | null;
  city?: string | null;
  price_rub: number;
  final_score_100: number;
  matched_tags: string[];
  matched_requirements?: string[];
  tech_stack: string[];
  compliance_tags: string[];
  source_url?: string | null;
  metrics_breakdown: RankerMetricBreakdown;
};

export type RankerResponse = {
  user_context: Record<string, unknown>;
  top_recommendations: RankerService[];
};

function providerIcon(providerName: string): string {
  const normalized = providerName.toLowerCase().replace(/[\s._-]+/g, "");

  if (normalized.includes("selectel")) {
    return "/selectel.png";
  }
  if (normalized.includes("vkcloud") || normalized === "vk") {
    return "/vkcloud.png";
  }
  if (normalized.includes("t1cloud") || normalized.includes("t1")) {
    return "/t1cloud.png";
  }
  if (normalized.includes("edgecenter")) {
    return "/edgecenter.png";
  }
  if (normalized.includes("yandexcloud")) {
    return "/yandexcloud.png";
  }
  if (normalized.includes("cloudru")) {
    return "/cloudru.png";
  }

  return "/cloud-service.svg";
}

function providerSourceUrl(providerName: string): string | null {
  const normalized = providerName.toLowerCase().replace(/[\s._-]+/g, "");

  if (normalized.includes("selectel")) {
    return "https://selectel.ru/prices/";
  }
  if (normalized.includes("vkcloud") || normalized === "vk") {
    return "https://cloud.vk.com/pricing/";
  }
  if (normalized.includes("t1cloud") || normalized.includes("t1")) {
    return "https://t1-cloud.ru/documents/rates";
  }
  if (normalized.includes("edgecenter")) {
    return "https://edgecenter.ru/cloud/price";
  }
  if (normalized.includes("yandexcloud")) {
    return "https://yandex.cloud/ru/price-list";
  }
  if (normalized.includes("cloudru")) {
    return "https://cloud.ru/services";
  }

  return null;
}

function publicSourceUrl(sourceUrl: string | null | undefined, providerName: string): string | null {
  return sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : providerSourceUrl(providerName);
}

@Injectable()
export class CloudRankerClient {
  private readonly logger = new Logger(CloudRankerClient.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async rank(intent: AiStudioIntent): Promise<{ recommendations: CloudRecommendation[]; raw: RankerResponse }> {
    const rankerUrl = this.config.get("RANKER_API_URL", { infer: true });
    const payload = {
      user_intent: intent,
      top_n: 10,
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
        this.toCloudRecommendation(service, intent),
      ),
    };
  }

  private toCloudRecommendation(
    service: RankerService,
    intent: AiStudioIntent,
  ): CloudRecommendation {
    const sourceUrl = publicSourceUrl(service.source_url, service.provider_name);
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
      sourceUrl,
      serviceType: service.service_type ?? null,
      city: service.city ?? null,
      description: service.description,
      finalScore: Math.max(0, Math.min(100, service.final_score_100)),
      monthlyPriceRub: Math.max(0, service.price_rub),
      services: uniqueServices.length > 0 ? uniqueServices : [service.provider_name],
      reasons: this.reasonsForService(service, intent),
      risks: [
        sourceUrl
          ? `Проверьте тариф и условия провайдера: ${sourceUrl}`
          : "Проверьте актуальный тариф и ограничения услуги у провайдера.",
      ],
      estimatedCostLevel: this.toCostLevel(service.price_rub),
      icon: providerIcon(service.provider_name),
    };
  }

  private reasonsForService(service: RankerService, intent: AiStudioIntent): string[] {
    const reasons = [
      this.categoryReason(service, intent),
      this.requirementsReason(service),
      this.complianceReason(service, intent),
    ].filter((reason): reason is string => Boolean(reason));

    return reasons.length > 0
      ? reasons
      : ["Сервис выбран как наиболее близкий по инфраструктурному смыслу запроса."];
  }

  private categoryReason(service: RankerService, intent: AiStudioIntent): string {
    if (intent.primary_service_type === "virtual_server") {
      return "Это именно виртуальный сервер, поэтому подбор не смешивает VPS с базами данных или хранилищами.";
    }
    if (service.category) {
      return `Категория услуги соответствует задаче: ${service.category}.`;
    }
    return "Услуга соответствует основной инфраструктурной задаче запроса.";
  }

  private requirementsReason(service: RankerService): string | null {
    if (!service.matched_requirements?.length) {
      return null;
    }

    return `Учтены строгие требования: ${service.matched_requirements.slice(0, 4).join(", ")}.`;
  }

  private complianceReason(service: RankerService, intent: AiStudioIntent): string | null {
    if (!intent.requires_152fz) {
      return null;
    }

    return service.compliance_tags.some((tag) => tag.toLowerCase().includes("152"))
      ? "Есть признак соответствия 152-ФЗ для задач с российскими персональными данными."
      : null;
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
