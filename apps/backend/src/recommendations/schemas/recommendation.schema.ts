import { z } from "zod";
import {
  cloudRecommendationSchema,
  createRecommendationSchema,
} from "@cloud-recommender/shared";

export const createRecommendationInputSchema = createRecommendationSchema;

export const yandexCloudStubResponseSchema = z.object({
  model: z.string(),
  generatedAt: z.string(),
  recommendations: z.array(cloudRecommendationSchema).max(7),
}).passthrough();

export type YandexCloudStubResponse = z.infer<typeof yandexCloudStubResponseSchema>;

export const aiStudioIntentSchema = z.object({
  task_type: z.string().min(1),
  primary_service_type: z.string().nullable().optional(),
  requires_152fz: z.boolean(),
  budget_max_rub: z.number().nullable(),
  budget_priority: z.enum(["min_price", "balanced", "performance_over_min_price"]).nullable().optional(),
  region: z.string().nullable(),
  country: z.string().nullable().optional(),
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
  semantic_query: z.string().min(1),
  reasoning_summary: z.string().min(1),
});

export type AiStudioIntent = z.infer<typeof aiStudioIntentSchema>;
