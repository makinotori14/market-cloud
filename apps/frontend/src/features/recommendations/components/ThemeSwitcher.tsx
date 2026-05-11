"use client";

import { LayoutGrid, List, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ThemeMode = "system" | "light" | "dark";
export type ResultsViewMode = "grid" | "list";

type ThemeSwitcherProps = {
  theme: ThemeMode;
  viewMode: ResultsViewMode;
  onThemeChange: (theme: ThemeMode) => void;
  onViewModeChange: (viewMode: ResultsViewMode) => void;
};

const themes: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "Системная", icon: Monitor },
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Темная", icon: Moon },
];

const views: Array<{ value: ResultsViewMode; label: string; icon: typeof LayoutGrid }> = [
  { value: "grid", label: "Плитки", icon: LayoutGrid },
  { value: "list", label: "Список", icon: List },
];

export function ThemeSwitcher({
  theme,
  viewMode,
  onThemeChange,
  onViewModeChange,
}: ThemeSwitcherProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="inline-flex w-fit rounded-ui border border-border bg-white p-1 dark:border-white/10 dark:bg-white/[0.06]">
        {views.map((item) => {
          const Icon = item.icon;
          const isActive = item.value === viewMode;

          return (
            <button
              aria-label={item.label}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-ui px-2.5 text-sm font-bold text-muted transition hover:bg-[#eef8ff] hover:text-[#063b6f] dark:text-white/82 dark:hover:bg-white/10 dark:hover:text-white",
                isActive && "bg-[#e9f7ff] text-[#063b6f] dark:bg-accent/20 dark:text-white",
              )}
              key={item.value}
              title={item.label}
              type="button"
              onClick={() => onViewModeChange(item.value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="inline-flex w-fit rounded-ui border border-border bg-white p-1 dark:border-white/10 dark:bg-white/[0.06]">
        {themes.map((item) => {
          const Icon = item.icon;
          const isActive = item.value === theme;

          return (
            <button
              aria-label={item.label}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-ui px-2.5 text-sm font-bold text-muted transition hover:bg-[#eef8ff] hover:text-[#063b6f] dark:text-white/82 dark:hover:bg-white/10 dark:hover:text-white",
                isActive && "bg-[#e9f7ff] text-[#063b6f] dark:bg-accent/20 dark:text-white",
              )}
              key={item.value}
              title={item.label}
              type="button"
              onClick={() => onThemeChange(item.value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
