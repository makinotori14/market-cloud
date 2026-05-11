import { z } from "zod";
export declare const recommendationStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
export declare const cloudRecommendationSchema: z.ZodObject<{
    id: z.ZodString;
    provider: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    finalScore: z.ZodNumber;
    services: z.ZodArray<z.ZodString, "many">;
    reasons: z.ZodArray<z.ZodString, "many">;
    risks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimatedCostLevel: z.ZodEnum<["low", "medium", "high"]>;
    icon: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    provider: string;
    title: string;
    description: string;
    finalScore: number;
    services: string[];
    reasons: string[];
    risks: string[];
    estimatedCostLevel: "low" | "medium" | "high";
    icon: string;
}, {
    id: string;
    provider: string;
    title: string;
    description: string;
    finalScore: number;
    services: string[];
    reasons: string[];
    estimatedCostLevel: "low" | "medium" | "high";
    risks?: string[] | undefined;
    icon?: string | undefined;
}>;
export declare const recommendationRequestSchema: z.ZodObject<{
    id: z.ZodString;
    prompt: z.ZodString;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    completedAt: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
    recommendations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        provider: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        finalScore: z.ZodNumber;
        services: z.ZodArray<z.ZodString, "many">;
        reasons: z.ZodArray<z.ZodString, "many">;
        risks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        estimatedCostLevel: z.ZodEnum<["low", "medium", "high"]>;
        icon: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        provider: string;
        title: string;
        description: string;
        finalScore: number;
        services: string[];
        reasons: string[];
        risks: string[];
        estimatedCostLevel: "low" | "medium" | "high";
        icon: string;
    }, {
        id: string;
        provider: string;
        title: string;
        description: string;
        finalScore: number;
        services: string[];
        reasons: string[];
        estimatedCostLevel: "low" | "medium" | "high";
        risks?: string[] | undefined;
        icon?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    prompt: string;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
    recommendations: {
        id: string;
        provider: string;
        title: string;
        description: string;
        finalScore: number;
        services: string[];
        reasons: string[];
        risks: string[];
        estimatedCostLevel: "low" | "medium" | "high";
        icon: string;
    }[];
}, {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    prompt: string;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
    recommendations: {
        id: string;
        provider: string;
        title: string;
        description: string;
        finalScore: number;
        services: string[];
        reasons: string[];
        estimatedCostLevel: "low" | "medium" | "high";
        risks?: string[] | undefined;
        icon?: string | undefined;
    }[];
}>;
export declare const createRecommendationSchema: z.ZodObject<{
    prompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    prompt: string;
}, {
    prompt: string;
}>;
export declare const recommendationHistoryItemSchema: z.ZodObject<{
    id: z.ZodString;
    prompt: z.ZodString;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    createdAt: z.ZodString;
    totalRecommendations: z.ZodNumber;
    bestScore: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    prompt: string;
    createdAt: string;
    totalRecommendations: number;
    bestScore: number | null;
}, {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    prompt: string;
    createdAt: string;
    totalRecommendations: number;
    bestScore: number | null;
}>;
export declare const recommendationQueueStatsSchema: z.ZodObject<{
    queued: z.ZodNumber;
    waiting: z.ZodNumber;
    active: z.ZodNumber;
    delayed: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    queued: number;
    waiting: number;
    active: number;
    delayed: number;
}, {
    queued: number;
    waiting: number;
    active: number;
    delayed: number;
}>;
export type RecommendationStatus = z.infer<typeof recommendationStatusSchema>;
export type CloudRecommendation = z.infer<typeof cloudRecommendationSchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type CreateRecommendationInput = z.infer<typeof createRecommendationSchema>;
export type RecommendationHistoryItem = z.infer<typeof recommendationHistoryItemSchema>;
export type RecommendationQueueStats = z.infer<typeof recommendationQueueStatsSchema>;
//# sourceMappingURL=index.d.ts.map