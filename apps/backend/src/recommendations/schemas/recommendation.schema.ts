import { z } from "zod";
import {
  cloudRecommendationSchema,
  createRecommendationSchema,
} from "@cloud-recommender/shared";

export const createRecommendationInputSchema = createRecommendationSchema;

export const yandexCloudStubResponseSchema = z.object({
  model: z.string(),
  generatedAt: z.string(),
  recommendations: z.array(cloudRecommendationSchema).max(100),
}).passthrough();

export type YandexCloudStubResponse = z.infer<typeof yandexCloudStubResponseSchema>;

export const aiStudioIntentSchema = z.object({
  task_type: z.string().min(1),
  primary_service_type: z.string().nullable().optional(),
  service_types: z.array(z.string()).optional(),
  requires_152fz: z.boolean(),
  budget_max_rub: z.number().nullable(),
  budget_priority: z.enum(["min_price", "balanced", "performance_over_min_price"]).nullable().optional(),
  region: z.string().nullable(),
  country: z.string().nullable().optional(),
  preferred_cities: z.array(z.string()).optional(),
  enabled_providers: z.array(z.string()).nullable().optional(),
  resource_requirements: z.object({
    cpu_min: z.number().nullable().optional(),
    ram_gb_min: z.number().nullable().optional(),
    disk_gb_min: z.number().nullable().optional(),
    disk_type: z.string().nullable().optional(),
    high_iops_preferred: z.boolean().optional(),
  }).optional(),
  workload: z.object({
    stage: z.string().nullable().optional(),
    availability: z.string().nullable().optional(),
    backup_required: z.boolean().optional(),
    stable_network_required: z.boolean().optional(),
  }).optional(),
  explicit_needs: z.array(z.string()).optional(),
  extracted_tech_stack: z.array(z.string()),
  inferred_needs: z.array(z.string()),
  optional_needs: z.array(z.string()).optional(),
  excluded_service_categories: z.array(z.string()).optional(),
  semantic_query: z.string().min(1),
  reasoning_summary: z.string().min(1),
});

export type AiStudioIntent = z.infer<typeof aiStudioIntentSchema>;

export const extractionAgentOutputSchema = z.object({
  task_summary: z.string(),
  task_category: z.string(),
  service_categories: z.array(z.string()),
  tech_stack: z.array(z.string()),
  business_context: z.array(z.string()),
  compliance_tags: z.array(z.string()),
  regional_requirements: z.array(z.string()),
  budget_max_rub: z.number().nullable(),
  budget_constraints: z.array(z.string()),
  availability_requirements: z.array(z.string()),
  predicted_needs: z.array(z.string()),
  risk_flags: z.array(z.string()),
  expanded_tags: z.array(z.string()),
  semantic_query: z.string(),
  embedding_chunks: z.array(z.string()),
  excluded_providers: z.array(z.string()),
  excluded_service_categories: z.array(z.string()),
  implicit_use_case: z.string().nullable(),
});

export type ExtractionAgentOutput = z.infer<typeof extractionAgentOutputSchema>;

export const explanationAgentOutputSchema = z.object({
  short_explanation: z.string().min(1),
  detailed_explanation: z.string().min(1),
  key_matches: z.array(z.string().min(1)).min(1).max(8),
  risk_mitigation: z.string().min(1).nullable(),
  budget_analysis: z.string().min(1),
});

export type ExplanationAgentOutput = z.infer<typeof explanationAgentOutputSchema>;
