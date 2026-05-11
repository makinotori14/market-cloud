"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckCircle2, ShieldCheck, TrendingUp, WalletCards, X } from "lucide-react";
import type { CloudRecommendation } from "../types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { ResultsViewMode } from "./ThemeSwitcher";

type RecommendationCardProps = {
  recommendation: CloudRecommendation;
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

export function RecommendationCard({ recommendation, rank, viewMode }: RecommendationCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const monthlyPrice = formatMonthlyPrice(recommendation.monthlyPriceRub);
  const rankStyle = rankStyles[rank];
  const icon = providerIcon(recommendation.provider, recommendation.icon);
  const explanation = recommendation.explanation;
  const visibleReasons = explanation?.keyMatches.length ? explanation.keyMatches : recommendation.reasons;

  return (
    <>
      <Card
        className={cn(
          "grid gap-4 p-4 transition hover:border-accent/60 hover:shadow-[0_18px_42px_rgba(6,59,111,0.12)] dark:border-white/10 dark:bg-[#0c1726] dark:hover:border-accent/60",
          rankStyle?.card,
          viewMode === "grid"
            ? "xl:grid-cols-[86px_minmax(0,1fr)]"
            : "md:grid-cols-[96px_minmax(0,1fr)] xl:grid-cols-[108px_minmax(0,1fr)]",
        )}
      >
        <div className="grid h-[86px] w-[86px] place-items-center rounded-ui border border-[#d5edfb] bg-white">
          <Image
            src={icon}
            width={62}
            height={62}
            alt={recommendation.provider}
            priority={recommendation.finalScore > 90}
            className="max-h-[62px] w-auto object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase text-accent">{recommendation.provider}</p>
                {rankStyle ? (
                  <span className={cn("rounded-ui border px-2 py-0.5 text-xs font-extrabold", rankStyle.badge)}>
                    {rankStyle.label}
                  </span>
                ) : null}
              </div>
              <h3 className="text-lg font-extrabold leading-tight">{recommendation.title}</h3>
            </div>
            <Badge className="w-fit gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {recommendation.finalScore}
            </Badge>
          </div>

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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold text-muted dark:text-white/84">
              {monthlyPrice ?? fallbackPrice[recommendation.estimatedCostLevel]}
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={() => setIsDetailsOpen(true)}>
              Подробнее
            </Button>
          </div>
        </div>
      </Card>

      {isDetailsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#03101f]/72 p-3 backdrop-blur-sm sm:p-6">
          <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5 shadow-[0_28px_80px_rgba(3,16,31,0.35)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold uppercase text-accent">{recommendation.provider}</p>
                <h3 className="text-xl font-extrabold leading-tight sm:text-2xl">{recommendation.title}</h3>
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
                  {explanation?.budgetAnalysis ?? monthlyPrice ?? fallbackPrice[recommendation.estimatedCostLevel]}
                </div>

                {explanation?.riskMitigation ? (
                  <div className="border-t border-border pt-4 text-sm leading-6 dark:border-white/10">
                    <div className="mb-2 font-extrabold">Снижение рисков</div>
                    {explanation.riskMitigation}
                  </div>
                ) : null}
              </aside>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
