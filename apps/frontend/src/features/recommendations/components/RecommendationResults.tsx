"use client";

import Image from "next/image";
import { Cloud, RefreshCw } from "lucide-react";
import type { RecommendationRequest } from "../types";
import { RecommendationCard } from "./RecommendationCard";
import { RequestStatus } from "./RequestStatus";
import { cn } from "@/shared/lib/cn";
import type { ResultsViewMode } from "./ThemeSwitcher";

type RecommendationResultsProps = {
  isFetching: boolean;
  request?: RecommendationRequest;
  viewMode: ResultsViewMode;
};

export function RecommendationResults({ isFetching, request, viewMode }: RecommendationResultsProps) {
  if (!request) {
    return (
      <section className="grid min-h-64 items-center gap-6 rounded-ui border border-border bg-white p-7 md:grid-cols-[150px_minmax(0,1fr)] dark:border-white/10 dark:bg-[#0c1726]">
        <div className="grid aspect-square w-[150px] place-items-center rounded-ui border border-[#d5edfb] bg-[#eef8ff]">
          <Image src="/cloud-service.svg" width={108} height={108} alt="" />
        </div>
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase text-accent">Напишите ваш запрос</p>
          <h2 className="text-2xl font-extrabold leading-tight">
            Результаты появятся после отправки промпта
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted dark:text-white/86">
            Backend создаст задачу, отправит ее в очередь и вернет отсортированный список
            решений после ответа заглушки Yandex Cloud.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-ui border border-border bg-white p-6 md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[#0c1726]">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase text-accent">Рекомендации</p>
          <h2 className="text-2xl font-extrabold leading-tight">
            {request.recommendations.length || 7} облачных решений
          </h2>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <RequestStatus status={request.status} errorMessage={request.errorMessage} />
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted dark:text-white/86">
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Обновляем статус
            </span>
          ) : null}
        </div>
      </div>

      {request.status !== "completed" ? (
        <div className="rounded-ui border border-dashed border-[#cfe4f4] bg-white/78 p-8 text-center text-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-white/86">
          <Cloud className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden="true" />
          Запрос обрабатывается. Результат появится автоматически.
        </div>
      ) : (
        <div className={cn("grid gap-4", viewMode === "grid" ? "xl:grid-cols-2" : "grid-cols-1")}>
          {request.recommendations.map((recommendation) => (
            <RecommendationCard
              recommendation={recommendation}
              key={recommendation.id}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </section>
  );
}
