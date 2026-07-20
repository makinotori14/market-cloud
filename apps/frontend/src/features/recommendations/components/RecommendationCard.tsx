"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, MapPin, ShieldCheck, TrendingUp, WalletCards, X } from "lucide-react";
import type { CloudRecommendation, RecommendationExplanation } from "../types";
import { getRecommendationExplanation } from "../api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { ResultsViewMode } from "./ThemeSwitcher";

type RecommendationCardProps = {
  compact?: boolean;
  recommendation: CloudRecommendation;
  requestId: string;
  rank: number;
  viewMode: ResultsViewMode;
};

const fallbackPrice: Record<CloudRecommendation["estimatedCostLevel"], string> = {
  low: "25 000 руб / мес",
  medium: "85 000 руб / мес",
  high: "180 000 руб / мес",
};

const rankStyles: Record<number, { card: string; badge: string; label: string }> = {
  1: {
    card: "border-[#d6a215] bg-[#fffaf0] shadow-[0_18px_42px_rgba(214,162,21,0.18)] dark:border-[#f6d36c]/75 dark:bg-[#2a230f]",
    badge: "border-[#d6a215] bg-[#fff3c4] text-[#5f4300] dark:border-[#f6d36c]/70 dark:bg-[#4a380d] dark:text-[#ffe7a3]",
    label: "1 место",
  },
  2: {
    card: "border-[#7f8da3] bg-[#f4f7fb] shadow-[0_18px_46px_rgba(71,85,105,0.24),0_0_0_2px_rgba(203,213,225,0.82)] dark:border-[#e2e8f0]/85 dark:bg-[#1f2733] dark:shadow-[0_18px_46px_rgba(148,163,184,0.22),0_0_0_2px_rgba(226,232,240,0.34)]",
    badge: "border-[#7f8da3] bg-[#dde4ee] text-[#1f2937] dark:border-[#e2e8f0]/80 dark:bg-[#4b5563] dark:text-[#ffffff]",
    label: "2 место",
  },
  3: {
    card: "border-[#b8783b] bg-[#fff7ef] shadow-[0_18px_42px_rgba(184,120,59,0.16)] dark:border-[#d99b63]/70 dark:bg-[#2a1b12]",
    badge: "border-[#b8783b] bg-[#ffe7d1] text-[#63340f] dark:border-[#d99b63]/65 dark:bg-[#4a2b18] dark:text-[#ffd7b5]",
    label: "3 место",
  },
};

function ServiceTitle({
  className,
  recommendation,
}: {
  className: string;
  recommendation: CloudRecommendation;
}) {
  const sourceUrl = recommendation.sourceUrl?.match(/^https?:\/\//i) ? recommendation.sourceUrl : null;

  if (!sourceUrl) {
    return <h3 className={className}>{recommendation.title}</h3>;
  }

  return (
    <h3 className={className}>
      <a
        className="underline decoration-accent/45 underline-offset-4 transition hover:text-accent hover:decoration-accent"
        href={sourceUrl}
        rel="noreferrer"
        target="_blank"
      >
        {recommendation.title}
      </a>
    </h3>
  );
}

function providerIcon(provider: string, fallbackIcon: string): string {
  const normalized = provider.toLowerCase().replace(/[\s._-]+/g, "");

  if (normalized.includes("selectel")) {
    return "/selectel.png";
  }
  if (normalized.includes("vkcloud") || normalized === "vk") {
    return "/vkcloud.png";
  }
  if (normalized.includes("t1cloud") || normalized.includes("t1")) {
    return "/t1cloud.png";
  }
  if (normalized.includes("edgecenter")) {
    return "/edgecenter.png";
  }
  if (normalized.includes("yandexcloud")) {
    return "/yandexcloud.png";
  }
  if (normalized.includes("cloudru")) {
    return "/cloudru.png";
  }

  return fallbackIcon;
}

function formatMonthlyPrice(priceRub: number | null): string | null {
  if (priceRub === null) {
    return null;
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: priceRub >= 100 ? 0 : 2,
  }).format(priceRub)} руб / мес`;
}

export function RecommendationCard({ compact = false, recommendation, requestId, rank, viewMode }: RecommendationCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [explanation, setExplanation] = useState<RecommendationExplanation | undefined>(
    recommendation.explanation,
  );
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const monthlyPrice = formatMonthlyPrice(recommendation.monthlyPriceRub);
  const displayedMonthlyPrice = monthlyPrice && recommendation.priceEstimated
    ? `≈ ${monthlyPrice}`
    : monthlyPrice;
  const rankStyle = rankStyles[rank];
  const icon = providerIcon(recommendation.provider, recommendation.icon);
  const visibleReasons = explanation?.keyMatches.length ? explanation.keyMatches : recommendation.reasons;

  const loadExplanation = async () => {
    if (explanation || isExplanationLoading) {
      return;
    }

    setIsExplanationLoading(true);
    setExplanationError(null);

    try {
      setExplanation(await getRecommendationExplanation(requestId, recommendation.id));
    } catch (error) {
      setExplanationError(
        error instanceof Error ? error.message : "Не удалось загрузить подробное объяснение.",
      );
    } finally {
      setIsExplanationLoading(false);
    }
  };

  const openDetails = () => {
    setIsDetailsOpen(true);
    void loadExplanation();
  };

  return (
    <>
      <Card
        className={cn(
          "grid transition hover:border-accent/60 hover:shadow-[0_18px_42px_rgba(6,59,111,0.12)] dark:border-white/10 dark:bg-[#0c1726] dark:hover:border-accent/60",
          rankStyle?.card,
          compact
            ? "grid-cols-[58px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[58px_minmax(0,1fr)_auto] sm:items-center"
            : viewMode === "grid"
            ? "xl:grid-cols-[86px_minmax(0,1fr)]"
            : "md:grid-cols-[96px_minmax(0,1fr)] xl:grid-cols-[108px_minmax(0,1fr)]",
          !compact && "gap-4 p-4",
        )}
      >
        <div className={cn(
          "grid place-items-center rounded-ui border border-[#d5edfb] bg-white",
          compact ? "h-[58px] w-[58px]" : "h-[86px] w-[86px]",
        )}>
          <Image
            src={icon}
            width={compact ? 40 : 62}
            height={compact ? 40 : 62}
            alt={recommendation.provider}
            priority={recommendation.finalScore > 90}
            className={cn("w-auto object-contain", compact ? "max-h-10" : "max-h-[62px]")}
          />
        </div>
        <div className="min-w-0">
          <div className={cn(
            "flex flex-col gap-3",
            !compact && "sm:flex-row sm:items-start sm:justify-between",
          )}>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase text-accent">{recommendation.provider}</p>
                {recommendation.city && !compact ? (
                  <span className="inline-flex items-center gap-1 rounded-ui border border-[#dceefa] bg-[#f3faff] px-2 py-0.5 text-xs font-bold text-[#17334f] dark:border-sky-300/35 dark:bg-[#10283f] dark:text-sky-50">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {recommendation.city}
                  </span>
                ) : null}
                {rankStyle && !compact ? (
                  <span className={cn("rounded-ui border px-2 py-0.5 text-xs font-extrabold", rankStyle.badge)}>
                    {rankStyle.label}
                  </span>
                ) : null}
              </div>
              <ServiceTitle
                className={cn("font-extrabold leading-tight", compact ? "text-base" : "text-lg")}
                recommendation={recommendation}
              />
            </div>
            {!compact ? (
              <Badge className="w-fit gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                {recommendation.finalScore}
              </Badge>
            ) : null}
          </div>

          {!compact ? (
            <>
              <p className="mt-3 text-sm leading-6 text-muted dark:text-white/94">
                {explanation?.shortExplanation ?? recommendation.description}
              </p>

              <div className={cn("mt-4 flex flex-wrap gap-2", viewMode === "list" && "max-w-5xl")}>
                {recommendation.services.map((service) => (
                  <span
                    className="rounded-ui border border-[#dceefa] bg-[#f3faff] px-2.5 py-1.5 text-xs font-semibold text-[#17334f] dark:border-sky-300/35 dark:bg-[#10283f] dark:text-sky-50"
                    key={service}
                  >
                    {service}
                  </span>
                ))}
              </div>

              <div className={cn("mt-4 grid gap-2 text-sm text-[#17334f] dark:text-white/90", viewMode === "list" && "md:grid-cols-2")}>
                {visibleReasons.slice(0, 3).map((reason) => (
                  <div className="flex gap-2" key={reason}>
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {!compact ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-semibold text-muted dark:text-white/84">
                {displayedMonthlyPrice ?? fallbackPrice[recommendation.estimatedCostLevel]}
              </div>
              <Button size="sm" variant="secondary" type="button" onClick={openDetails}>
                {isExplanationLoading ? "Загрузка…" : "Подробнее"}
              </Button>
            </div>
          ) : null}
        </div>

        {compact ? (
          <div className="col-span-2 flex items-center justify-between gap-3 border-t border-current/10 pt-3 sm:col-span-1 sm:min-w-48 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <Badge className="w-fit gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {recommendation.finalScore}
            </Badge>
            <div className="ml-auto text-right text-xs font-semibold text-muted dark:text-white/84 sm:ml-0">
              {displayedMonthlyPrice ?? fallbackPrice[recommendation.estimatedCostLevel]}
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={openDetails}>
              {isExplanationLoading ? "Загрузка…" : "Подробнее"}
            </Button>
          </div>
        ) : null}
      </Card>

      {isDetailsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#03101f]/72 p-3 backdrop-blur-sm sm:p-6">
          <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5 shadow-[0_28px_80px_rgba(3,16,31,0.35)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase text-accent">{recommendation.provider}</p>
                  {recommendation.city ? (
                    <span className="inline-flex items-center gap-1 rounded-ui border border-[#dceefa] bg-[#f3faff] px-2 py-0.5 text-xs font-bold text-[#17334f] dark:border-sky-300/35 dark:bg-[#10283f] dark:text-sky-50">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {recommendation.city}
                    </span>
                  ) : null}
                </div>
                <ServiceTitle
                  className="text-xl font-extrabold leading-tight sm:text-2xl"
                  recommendation={recommendation}
                />
              </div>
              <Button
                aria-label="Закрыть подробности"
                className="h-10 w-10 flex-none px-0"
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => setIsDetailsOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {isExplanationLoading ? (
              <div className="mt-5 grid min-h-48 place-items-center rounded-ui border border-dashed border-[#cfe4f4] bg-[#f8fcff] p-8 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <div>
                  <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-accent" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-muted dark:text-white/86">
                    Готовим подробное объяснение…
                  </p>
                </div>
              </div>
            ) : explanationError && !explanation ? (
              <div className="mt-5 grid min-h-48 place-items-center rounded-ui border border-red-200 bg-red-50 p-8 text-center dark:border-red-400/25 dark:bg-red-950/20">
                <div>
                  <AlertCircle className="mx-auto h-8 w-8 text-red-600 dark:text-red-300" aria-hidden="true" />
                  <p className="mt-3 text-sm text-red-800 dark:text-red-100">{explanationError}</p>
                  <Button className="mt-4" size="sm" type="button" variant="secondary" onClick={() => void loadExplanation()}>
                    Повторить
                  </Button>
                </div>
              </div>
            ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-4">
                {(explanation?.detailedExplanation ?? recommendation.description)
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((paragraph) => (
                    <p className="text-sm leading-7 text-muted dark:text-white/90" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
              </div>

              <aside className="grid content-start gap-4 rounded-ui border border-border bg-[#f8fcff] p-4 dark:border-white/10 dark:bg-white/[0.06]">
                <div>
                  <h4 className="text-sm font-extrabold">Ключевые совпадения</h4>
                  <div className="mt-3 grid gap-2">
                    {visibleReasons.slice(0, 5).map((reason) => (
                      <div className="flex gap-2 text-sm" key={reason}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4 text-sm leading-6 dark:border-white/10">
                  <div className="mb-2 flex items-center gap-2 font-extrabold">
                    <WalletCards className="h-4 w-4 text-accent" aria-hidden="true" />
                    Бюджет
                  </div>
                  {explanation?.budgetAnalysis ?? displayedMonthlyPrice ?? fallbackPrice[recommendation.estimatedCostLevel]}
                </div>

                {explanation?.riskMitigation ? (
                  <div className="border-t border-border pt-4 text-sm leading-6 dark:border-white/10">
                    <div className="mb-2 font-extrabold">Снижение рисков</div>
                    {explanation.riskMitigation}
                  </div>
                ) : null}
              </aside>
            </div>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
