"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Cloud, Link2, RefreshCw, SearchX, TrendingUp } from "lucide-react";
import type { CloudRecommendation, RecommendationRequest } from "../types";
import { RecommendationCard } from "./RecommendationCard";
import { RequestStatus } from "./RequestStatus";
import { cn } from "@/shared/lib/cn";
import type { ResultsViewMode } from "./ThemeSwitcher";

type RecommendationResultsProps = {
  isFetching: boolean;
  request?: RecommendationRequest;
  viewMode: ResultsViewMode;
};

type RecommendationGroup = {
  serviceType: string;
  label: string;
  recommendations: CloudRecommendation[];
};

type RecommendationChain = {
  id: string;
  recommendations: CloudRecommendation[];
  score: number;
};

const CHAINS_TAB = "chains";

const chainFrameStyles = [
  "border-[#d6a215] shadow-[0_16px_44px_rgba(214,162,21,0.16)] dark:border-[#f6d36c]/75",
  "border-[#7f8da3] shadow-[0_16px_44px_rgba(100,116,139,0.18)] dark:border-[#e2e8f0]/75",
  "border-[#b8783b] shadow-[0_16px_44px_rgba(184,120,59,0.16)] dark:border-[#d99b63]/70",
] as const;

const serviceTypeLabels: Record<string, string> = {
  virtual_server: "VPS",
  managed_database: "База данных",
  object_storage: "Object Storage",
  managed_kubernetes: "Kubernetes",
  cloud_backup: "Backup",
  cdn: "CDN",
  waf: "WAF",
  load_balancer: "Load Balancer",
  gpu_server: "GPU",
  bare_metal: "Bare Metal",
};

function serviceTypeLabel(serviceType: string): string {
  return serviceTypeLabels[serviceType] ?? serviceType
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function buildRecommendationGroups(request: RecommendationRequest): RecommendationGroup[] {
  const serviceTypes = request.serviceTypes.length > 0
    ? request.serviceTypes
    : request.recommendations.reduce<string[]>((types, recommendation) => {
      if (recommendation.serviceType && !types.includes(recommendation.serviceType)) {
        types.push(recommendation.serviceType);
      }

      return types;
    }, []);

  if (serviceTypes.length === 0) {
    return [
      {
        serviceType: "all",
        label: "Решения",
        recommendations: request.recommendations,
      },
    ];
  }

  return serviceTypes.map((serviceType) => ({
    serviceType,
    label: serviceTypeLabel(serviceType),
    recommendations: request.recommendations.filter((recommendation) => recommendation.serviceType === serviceType),
  }));
}

function geometricMean(scores: number[]): number {
  if (scores.length === 0 || scores.some((score) => score <= 0)) {
    return 0;
  }

  const logarithmicMean = scores.reduce((sum, score) => sum + Math.log(score), 0) / scores.length;

  return Math.round(Math.exp(logarithmicMean) * 10) / 10;
}

function buildRecommendationChains(groups: RecommendationGroup[]): RecommendationChain[] {
  if (groups.length < 2 || groups.some((group) => group.recommendations.length === 0)) {
    return [];
  }

  const chainCount = Math.min(...groups.map((group) => group.recommendations.length));

  return Array.from({ length: chainCount }, (_, index) => {
    const recommendations = groups.map((group) => group.recommendations[index]!);

    return {
      id: `chain-${index + 1}`,
      recommendations,
      score: geometricMean(recommendations.map((recommendation) => recommendation.finalScore)),
    };
  });
}

export function RecommendationResults({ isFetching, request, viewMode }: RecommendationResultsProps) {
  const groups = useMemo(() => (request ? buildRecommendationGroups(request) : []), [request]);
  const chains = useMemo(() => buildRecommendationChains(groups), [groups]);
  const [activeServiceType, setActiveServiceType] = useState<string | null>(null);
  const activeGroup = groups.find((group) => group.serviceType === activeServiceType) ?? groups[0];
  const hasChainsTab = groups.length > 1;
  const isChainsActive = activeServiceType === CHAINS_TAB && hasChainsTab;

  useEffect(() => {
    setActiveServiceType(groups.length > 1 ? CHAINS_TAB : (groups[0]?.serviceType ?? null));
  }, [request?.id, groups]);

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
            Мы отправим ее в очередь и вернем отсортированный список решений под вашу задачу.
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
            {request.recommendations.length} облачных решений
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
      ) : request.recommendations.length === 0 ? (
        <div className="rounded-ui border border-dashed border-[#cfe4f4] bg-white/78 p-8 text-center text-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-white/86">
          <SearchX className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden="true" />
          Не нашли конфигурации, которая одновременно проходит все жесткие требования.
        </div>
      ) : (
        <div className="grid gap-4">
          <div
            aria-label="Типы решений"
            className="flex gap-2 overflow-x-auto rounded-ui border border-border bg-white p-2 dark:border-white/10 dark:bg-[#0c1726]"
            role="tablist"
          >
            {hasChainsTab ? (
              <button
                aria-label={`Связки: ${chains.length}`}
                aria-selected={isChainsActive}
                className={cn(
                  "inline-flex min-h-11 flex-none items-center gap-2 rounded-ui border px-4 text-sm font-extrabold transition",
                  isChainsActive
                    ? "border-[#005ee8] bg-gradient-to-r from-[#0047d9] via-[#006ee6] to-[#00a7e8] text-white shadow-[0_10px_28px_rgba(0,94,232,0.34)]"
                    : "border-[#9dd7f7] bg-[#eef8ff] text-[#064a85] hover:border-[#31a9ed] hover:bg-[#dff3ff] dark:border-[#31a9ed]/40 dark:bg-[#007bdc]/15 dark:text-[#cceeff] dark:hover:bg-[#007bdc]/25",
                )}
                role="tab"
                type="button"
                onClick={() => setActiveServiceType(CHAINS_TAB)}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Связки
                <span className="text-xs opacity-75">{chains.length}</span>
              </button>
            ) : null}
            {groups.map((group) => (
              <button
                aria-label={`${group.label}: ${group.recommendations.length}`}
                aria-selected={!isChainsActive && activeGroup?.serviceType === group.serviceType}
                className={cn(
                  "min-h-11 flex-none rounded-ui px-4 text-sm font-extrabold transition",
                  !isChainsActive && activeGroup?.serviceType === group.serviceType
                    ? "bg-accent text-white shadow-[0_10px_24px_rgba(0,167,232,0.24)]"
                    : "text-muted hover:bg-[#eef8ff] hover:text-[#07111f] dark:text-white/76 dark:hover:bg-white/10 dark:hover:text-white",
                )}
                key={group.serviceType}
                role="tab"
                type="button"
                onClick={() => setActiveServiceType(group.serviceType)}
              >
                {group.label}
                <span className="ml-2 text-xs opacity-75">{group.recommendations.length}</span>
              </button>
            ))}
          </div>

          {isChainsActive ? (
            <div className="grid gap-5">
              {chains.length > 0 ? chains.map((chain, chainIndex) => (
                <section
                  className={cn(
                    "grid gap-4 rounded-ui border-2 bg-white/80 p-4 dark:bg-[#0c1726]",
                    chainFrameStyles[chainIndex]
                      ?? "border-[#8bcff5] shadow-[0_16px_44px_rgba(0,112,210,0.12)] dark:border-[#31a9ed]/30",
                  )}
                  key={chain.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-ui bg-gradient-to-br from-[#0047d9] via-[#006ee6] to-[#00a7e8] text-white shadow-[0_8px_20px_rgba(0,94,232,0.28)]">
                        <Link2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-extrabold">Связка {chainIndex + 1}</h3>
                        <p className="text-xs text-muted dark:text-white/72">
                          {chain.recommendations.length} решений
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-ui bg-gradient-to-r from-[#0047d9] to-[#00a7e8] px-3 py-2 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,94,232,0.22)]">
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
                      Рейтинг {chain.score}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {chain.recommendations.map((recommendation) => (
                      <RecommendationCard
                        compact
                        recommendation={recommendation}
                        requestId={request.id}
                        key={`${chain.id}-${recommendation.id}`}
                        rank={chainIndex + 1}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                </section>
              )) : (
                <div className="rounded-ui border border-dashed border-[#9dd7f7] bg-white/78 p-8 text-center text-muted dark:border-[#31a9ed]/30 dark:bg-white/[0.04] dark:text-white/86">
                  <SearchX className="mx-auto mb-3 h-8 w-8 text-[#006ee6] dark:text-[#70c9f7]" aria-hidden="true" />
                  Полную связку собрать нельзя: хотя бы в одной сервисной вкладке нет подходящих решений.
                </div>
              )}
            </div>
          ) : activeGroup?.recommendations.length ? (
            <div className={cn("grid gap-4", viewMode === "grid" ? "xl:grid-cols-2" : "grid-cols-1")}>
              {activeGroup.recommendations.map((recommendation, index) => (
                <RecommendationCard
                  recommendation={recommendation}
                  requestId={request.id}
                  key={recommendation.id}
                  rank={index + 1}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-ui border border-dashed border-[#cfe4f4] bg-white/78 p-8 text-center text-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-white/86">
              <SearchX className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden="true" />
              Для этой части запроса подходящих конфигураций не нашлось.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
