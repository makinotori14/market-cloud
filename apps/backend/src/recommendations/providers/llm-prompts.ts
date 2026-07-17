export const extractionSystemPrompt = `
You are a deterministic extraction agent for a Russian cloud services marketplace.
Never answer conversationally. Return only JSON matching the supplied schema.

Extract explicit technical intent, normalize cloud terminology, infer only strongly implied
infrastructure needs, and produce compact tags for SentenceBERT retrieval. Do not invent services.

Supported providers and normalized IDs:
- VK Cloud: vkcloud
- Selectel: selectel
- T1 Cloud: t1cloud
- EdgeCenter: edgecenter
- Yandex Cloud: yandexcloud
- Cloud.ru: cloudru

Use normalized service categories such as compute, managed-postgresql, managed-database,
kubernetes, object-storage, gpu, backup, cdn, load-balancer, monitoring, redis, and clickhouse.
Use short lowercase infrastructure tags in semantic_query (at most 20 tokens) and 3-8 compact
embedding_chunks. compliance_tags may contain 152-fz, data-localization, russian-datacenter.
budget_constraints may contain low-budget, medium-budget, enterprise-budget, cost-optimized.
availability_requirements may contain high-availability, backup-required, disaster-recovery,
fault-tolerance. Put explicitly rejected providers and service categories into their excluded arrays.
budget_max_rub is the explicit monthly budget in RUB or null. implicit_use_case is a short normalized
use case or null. Arrays must be empty when no value is supported by the input.
`.trim();

export const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    task_summary: { type: "string" },
    task_category: { type: "string" },
    service_categories: { type: "array", items: { type: "string" } },
    tech_stack: { type: "array", items: { type: "string" } },
    business_context: { type: "array", items: { type: "string" } },
    compliance_tags: { type: "array", items: { type: "string" } },
    regional_requirements: { type: "array", items: { type: "string" } },
    budget_max_rub: { type: ["number", "null"] },
    budget_constraints: { type: "array", items: { type: "string" } },
    availability_requirements: { type: "array", items: { type: "string" } },
    predicted_needs: { type: "array", items: { type: "string" } },
    risk_flags: { type: "array", items: { type: "string" } },
    expanded_tags: { type: "array", items: { type: "string" } },
    semantic_query: { type: "string" },
    embedding_chunks: { type: "array", items: { type: "string" } },
    excluded_providers: { type: "array", items: { type: "string" } },
    excluded_service_categories: { type: "array", items: { type: "string" } },
    implicit_use_case: { type: ["string", "null"] },
  },
  required: [
    "task_summary", "task_category", "service_categories", "tech_stack", "business_context",
    "compliance_tags", "regional_requirements", "budget_max_rub", "budget_constraints",
    "availability_requirements", "predicted_needs", "risk_flags", "expanded_tags",
    "semantic_query", "embedding_chunks", "excluded_providers", "excluded_service_categories",
    "implicit_use_case",
  ],
} as const;

export const explanationSystemPrompt = `
You explain ranked cloud services to a Russian-speaking user. Return one explanation for every
service_id from the input, in the same order, using only the supplied user profile and service data.
Be concise and factual; do not invent features, compliance, discounts, or guarantees. Mention why
the service matches, one material caveat when present, and interpret the supplied monthly price.
When price_is_estimate is true, explicitly call the price an approximate estimate rather than a tariff.
All explanation text must be in Russian. key_matches must contain 1-5 short items.
`.trim();

const explanationProperties = {
  service_id: { type: "string" },
  short_explanation: { type: "string" },
  detailed_explanation: { type: "string" },
  key_matches: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
  risk_mitigation: { type: ["string", "null"] },
  budget_analysis: { type: "string" },
} as const;

export const batchExplanationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    explanations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: explanationProperties,
        required: Object.keys(explanationProperties),
      },
    },
  },
  required: ["explanations"],
} as const;
