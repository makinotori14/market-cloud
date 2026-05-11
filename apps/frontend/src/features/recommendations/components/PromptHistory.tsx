"use client";

import Image from "next/image";
import { Clock3, Loader2, Trash2 } from "lucide-react";
import type { RecommendationHistoryItem } from "../types";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

type PromptHistoryProps = {
  activeId?: string;
  isClearing: boolean;
  isLoading: boolean;
  items: RecommendationHistoryItem[];
  onClear: () => void;
  onSelect: (id: string) => void;
};

const statusLabel: Record<RecommendationHistoryItem["status"], string> = {
  pending: "В очереди",
  processing: "Считается",
  completed: "Готово",
  failed: "Ошибка",
};

export function PromptHistory({
  activeId,
  isClearing,
  isLoading,
  items,
  onClear,
  onSelect,
}: PromptHistoryProps) {
  const canClear = items.length > 0 && !isClearing;

  return (
    <aside className="flex min-h-0 flex-col bg-[#07111f] p-7 text-white lg:h-[calc(100vh-56px)]">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-ui border border-white/[0.12] bg-white shadow-[0_14px_28px_rgba(0,119,255,0.24)]">
          <Image
            src="/logo.png"
            width={34}
            height={34}
            alt=""
            priority
            className="h-8 w-8 object-contain"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase text-accent">FA x MAI Triad</p>
          <h1 className="max-w-56 text-lg font-extrabold leading-tight">
            Подбор облачных решений
          </h1>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold">История</h2>
        <span className="text-sm text-white/82">{items.length} запросов</span>
      </div>

      <button
        className="mt-4 inline-flex min-h-9 w-full items-center gap-2 rounded-ui border border-white/10 bg-white/[0.055] px-3 text-left text-xs font-bold text-white/88 transition hover:border-accent/50 hover:bg-accent/15 hover:text-white disabled:pointer-events-none disabled:opacity-55"
        disabled={!canClear}
        type="button"
        onClick={onClear}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {isClearing ? "Очищаем" : "Очистить историю"}
      </button>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(0,167,232,0.55)_transparent] [scrollbar-width:thin]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/86">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Загружаем историю
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-ui border border-white/10 bg-white/[0.055] p-4 text-sm leading-6 text-white/86">
            История появится после первого запроса.
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {items.map((item) => (
              <li className="min-w-0" key={item.id}>
                <button
                  className={cn(
                    "w-full rounded-ui border border-white/10 bg-white/[0.055] p-4 text-left transition hover:border-accent/50 hover:bg-accent/15",
                    activeId === item.id && "border-accent/70 bg-accent/18",
                  )}
                  type="button"
                  onClick={() => onSelect(item.id)}
                >
                  <span className="line-clamp-2 break-words text-sm font-semibold leading-5 text-white">
                    {item.prompt}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-xs text-white/84">
                      <Clock3 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                      {new Date(item.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Badge className="flex-none border-white/10 bg-white/10 text-white">
                      {item.bestScore ?? statusLabel[item.status]}
                    </Badge>
                  </span>
                </button>
              </li>
          ))}
        </ul>
      )}
      </div>
    </aside>
  );
}
