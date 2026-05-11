import {
  recommendationHistoryItemSchema,
  recommendationQueueStatsSchema,
  recommendationRequestSchema,
  type CreateRecommendationInput,
  type RecommendationHistoryItem,
  type RecommendationQueueStats,
  type RecommendationRequest,
} from "@cloud-recommender/shared";
import { z } from "zod";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createRecommendation(
  input: CreateRecommendationInput,
): Promise<RecommendationRequest> {
  const data = await request<unknown>("/recommendations", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return recommendationRequestSchema.parse(data);
}

export async function getRecommendation(id: string): Promise<RecommendationRequest> {
  const data = await request<unknown>(`/recommendations/${id}`);
  return recommendationRequestSchema.parse(data);
}

export async function getRecommendationHistory(): Promise<RecommendationHistoryItem[]> {
  const data = await request<unknown>("/recommendations");
  return z.array(recommendationHistoryItemSchema).parse(data);
}

export async function clearRecommendationHistory(): Promise<{ deleted: number }> {
  return request<{ deleted: number }>("/recommendations", {
    method: "DELETE",
  });
}

export async function getRecommendationStats(): Promise<RecommendationQueueStats> {
  const data = await request<unknown>("/recommendations/meta/stats");
  return recommendationQueueStatsSchema.parse(data);
}
