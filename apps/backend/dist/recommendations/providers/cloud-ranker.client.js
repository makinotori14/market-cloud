var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CloudRankerClient_1;
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
let CloudRankerClient = CloudRankerClient_1 = class CloudRankerClient {
    config;
    logger = new Logger(CloudRankerClient_1.name);
    constructor(config) {
        this.config = config;
    }
    async rank(intent) {
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
        const raw = (await response.json().catch(() => ({})));
        if (!response.ok) {
            const detail = typeof raw.detail === "string"
                ? raw.detail
                : raw.detail
                    ? JSON.stringify(raw.detail)
                    : undefined;
            throw new Error(detail ?? `Ranker request failed: ${response.status}`);
        }
        return {
            raw,
            recommendations: raw.top_recommendations.map((service) => this.toCloudRecommendation(service, intent.reasoning_summary)),
        };
    }
    toCloudRecommendation(service, reasoningSummary) {
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
    toCostLevel(priceRub) {
        if (priceRub < 15_000) {
            return "low";
        }
        if (priceRub < 100_000) {
            return "medium";
        }
        return "high";
    }
};
CloudRankerClient = CloudRankerClient_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], CloudRankerClient);
export { CloudRankerClient };
//# sourceMappingURL=cloud-ranker.client.js.map