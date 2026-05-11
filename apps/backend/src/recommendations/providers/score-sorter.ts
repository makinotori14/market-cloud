import type { CloudRecommendation } from "@cloud-recommender/shared";

export function sortByFinalScore(recommendations: CloudRecommendation[]) {
  return [...recommendations].sort((left, right) => right.finalScore - left.finalScore);
}
