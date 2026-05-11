import { z } from "zod";
export const recommendationStatusSchema = z.enum([
    "pending",
    "processing",
    "completed",
    "failed",
]);
export const cloudRecommendationSchema = z.object({
    id: z.string(),
    provider: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    finalScore: z.number().min(0).max(100),
    services: z.array(z.string().min(1)).min(1),
    reasons: z.array(z.string().min(1)).min(1),
    risks: z.array(z.string().min(1)).default([]),
    estimatedCostLevel: z.enum(["low", "medium", "high"]),
    icon: z.string().default("/cloud-service.svg"),
});
export const recommendationRequestSchema = z.object({
    id: z.string(),
    prompt: z.string(),
    status: recommendationStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
    errorMessage: z.string().nullable(),
    recommendations: z.array(cloudRecommendationSchema),
});
export const createRecommendationSchema = z.object({
    prompt: z.string().trim().min(8).max(3000),
});
export const recommendationHistoryItemSchema = z.object({
    id: z.string(),
    prompt: z.string(),
    status: recommendationStatusSchema,
    createdAt: z.string(),
    totalRecommendations: z.number().int().nonnegative(),
    bestScore: z.number().nullable(),
});
export const recommendationQueueStatsSchema = z.object({
    queued: z.number().int().nonnegative(),
    waiting: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    delayed: z.number().int().nonnegative(),
});
