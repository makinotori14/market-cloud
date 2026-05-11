import Image from "next/image";
import { ShieldCheck, TrendingUp } from "lucide-react";
import type { CloudRecommendation } from "../types";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { ResultsViewMode } from "./ThemeSwitcher";

type RecommendationCardProps = {
  recommendation: CloudRecommendation;
  viewMode: ResultsViewMode;
};

const monthlyPriceByTitle: Record<string, string> = {
  "Managed Kubernetes Platform": "186 000 руб / мес",
  "Foundation Models Scoring": "92 000 руб / мес",
  "Serverless Containers API": "38 000 руб / мес",
  "Managed PostgreSQL Core": "74 000 руб / мес",
  "Observability Pack": "29 000 руб / мес",
  "DataSphere Evaluation Loop": "118 000 руб / мес",
  "Object Storage + CDN": "16 000 руб / мес",
};

const fallbackPrice: Record<CloudRecommendation["estimatedCostLevel"], string> = {
  low: "25 000 руб / мес",
  medium: "85 000 руб / мес",
  high: "180 000 руб / мес",
};

export function RecommendationCard({ recommendation, viewMode }: RecommendationCardProps) {
  return (
    <Card
      className={cn(
        "grid gap-4 p-4 transition hover:border-accent/60 hover:shadow-[0_18px_42px_rgba(6,59,111,0.12)] dark:border-white/10 dark:bg-[#0c1726] dark:hover:border-accent/60",
        viewMode === "grid"
          ? "xl:grid-cols-[86px_minmax(0,1fr)]"
          : "md:grid-cols-[96px_minmax(0,1fr)] xl:grid-cols-[108px_minmax(0,1fr)]",
      )}
    >
      <div className="grid h-[86px] w-[86px] place-items-center rounded-ui border border-[#d5edfb] bg-[#eef8ff]">
        <Image
          src={recommendation.icon}
          width={62}
          height={62}
          alt=""
          priority={recommendation.finalScore > 90}
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-accent">{recommendation.provider}</p>
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
          {monthlyPriceByTitle[recommendation.title] ?? fallbackPrice[recommendation.estimatedCostLevel]}
        </div>
      </div>
    </Card>
  );
}
