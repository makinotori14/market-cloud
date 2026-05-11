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

export const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}/api${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiRequestError(message || `Request failed with status ${response.status}`, response.status);
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
  try {
    return await request<{ deleted: number }>("/recommendations/clear", {
      method: "POST",
    });
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 404 || error.status === 405)) {
      return request<{ deleted: number }>("/recommendations", {
        method: "DELETE",
      });
    }

    throw error;
  }
}

export async function getRecommendationStats(): Promise<RecommendationQueueStats> {
  const data = await request<unknown>("/recommendations/meta/stats");
  return recommendationQueueStatsSchema.parse(data);
}
