"use client";

import { AlertCircle, CheckCircle2, Loader2, Timer } from "lucide-react";
import type { RecommendationStatus } from "../types";
import { cn } from "@/shared/lib/cn";

type RequestStatusProps = {
  status?: RecommendationStatus;
  errorMessage?: string | null;
};

const config: Record<RecommendationStatus, { label: string; className: string }> = {
  pending: {
    label: "Запрос в очереди",
    className: "border-[#ccecff] bg-[#e9f7ff] text-[#063b6f] dark:border-sky-300/30 dark:bg-sky-300/10 dark:text-sky-100",
  },
  processing: {
    label: "Yandex Cloud stub считает score",
    className: "border-[#ccecff] bg-[#e9f7ff] text-[#063b6f] dark:border-sky-300/30 dark:bg-sky-300/10 dark:text-sky-100",
  },
  completed: {
    label: "Решения отсортированы по рейтингу соответствия запросу",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100",
  },
  failed: {
    label: "Обработка завершилась ошибкой",
    className: "border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100",
  },
};

export function RequestStatus({ status, errorMessage }: RequestStatusProps) {
  if (!status) {
    return null;
  }

  const item = config[status];
  const Icon =
    status === "completed" ? CheckCircle2 : status === "failed" ? AlertCircle : status === "pending" ? Timer : Loader2;

  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-ui border px-3 py-2 text-sm font-semibold",
        item.className,
      )}
    >
      <Icon className={cn("h-4 w-4", status === "processing" && "animate-spin")} aria-hidden="true" />
      <span>{errorMessage ?? item.label}</span>
    </div>
  );
}
