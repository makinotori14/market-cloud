import Image from "next/image";
import { ShieldCheck, TrendingUp } from "lucide-react";
import type { CloudRecommendation } from "../types";
import { Badge } from "@/shared/ui/badge";
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
    card: "border-[#a7b0bd] bg-[#f8fafc] shadow-[0_18px_42px_rgba(103,116,139,0.16)] dark:border-[#d5dbe4]/65 dark:bg-[#20252d]",
    badge: "border-[#a7b0bd] bg-[#eef2f7] text-[#334155] dark:border-[#d5dbe4]/60 dark:bg-[#374151] dark:text-[#f8fafc]",
    label: "2 место",
  },
  3: {
    card: "border-[#b8783b] bg-[#fff7ef] shadow-[0_18px_42px_rgba(184,120,59,0.16)] dark:border-[#d99b63]/70 dark:bg-[#2a1b12]",
    badge: "border-[#b8783b] bg-[#ffe7d1] text-[#63340f] dark:border-[#d99b63]/65 dark:bg-[#4a2b18] dark:text-[#ffd7b5]",
    label: "3 место",
  },
};

function providerIcon(provider: string, fallbackIcon: string): string {
  const normalized = provider.toLowerCase().replace(/[\s_-]+/g, "");

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
  const monthlyPrice = formatMonthlyPrice(recommendation.monthlyPriceRub);
  const rankStyle = rankStyles[rank];
  const icon = providerIcon(recommendation.provider, recommendation.icon);

  return (
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

        <p className="mt-3 text-sm leading-6 text-muted dark:text-white/94">{recommendation.description}</p>

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
          {recommendation.reasons.slice(0, 2).map((reason) => (
            <div className="flex gap-2" key={reason}>
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
              <span>{reason}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs font-semibold text-muted dark:text-white/84">
          {monthlyPrice ?? fallbackPrice[recommendation.estimatedCostLevel]}
        </div>
      </div>
    </Card>
  );
}
