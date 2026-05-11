"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import {
  clearRecommendationHistory,
  createRecommendation,
  getRecommendation,
  getRecommendationHistory,
  getRecommendationStats,
} from "../api";
import { PromptForm } from "./PromptForm";
import { PromptHistory } from "./PromptHistory";
import { RecommendationResults } from "./RecommendationResults";
import {
  ThemeSwitcher,
  type ResultsViewMode,
  type ThemeMode,
} from "./ThemeSwitcher";

const themeStorageKey = "cloud-recommender:theme";
const viewStorageKey = "cloud-recommender:results-view";

function getStoredTheme(): ThemeMode {
  const saved = window.localStorage.getItem(themeStorageKey);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function getStoredViewMode(): ResultsViewMode {
  const saved = window.localStorage.getItem(viewStorageKey);
  return saved === "grid" || saved === "list" ? saved : "grid";
}

export function RecommendationsWorkspace() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string>();
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [viewMode, setViewMode] = useState<ResultsViewMode>("grid");
  const [arePreferencesReady, setArePreferencesReady] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setViewMode(getStoredViewMode());
    setArePreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!arePreferencesReady) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const resolvedTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem(themeStorageKey, theme);
    }

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => media.removeEventListener("change", applyTheme);
  }, [arePreferencesReady, theme]);

  useEffect(() => {
    if (!arePreferencesReady) {
      return;
    }

    window.localStorage.setItem(viewStorageKey, viewMode);
  }, [arePreferencesReady, viewMode]);

  const historyQuery = useQuery({
    queryKey: ["recommendations", "history"],
    queryFn: getRecommendationHistory,
    refetchInterval: 2000,
  });

  const statsQuery = useQuery({
    queryKey: ["recommendations", "stats"],
    queryFn: getRecommendationStats,
    refetchInterval: 1200,
  });

  const requestQuery = useQuery({
    queryKey: ["recommendations", activeId],
    queryFn: () => getRecommendation(activeId as string),
    enabled: Boolean(activeId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1200;
    },
  });

  const createMutation = useMutation({
    mutationFn: createRecommendation,
    onSuccess: (request) => {
      setActiveId(request.id);
      void queryClient.invalidateQueries({ queryKey: ["recommendations", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["recommendations", "stats"] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: clearRecommendationHistory,
    onSuccess: () => {
      setActiveId(undefined);
      queryClient.removeQueries({ queryKey: ["recommendations"], exact: false });
      void queryClient.invalidateQueries({ queryKey: ["recommendations", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["recommendations", "stats"] });
    },
  });

  useEffect(() => {
    if (requestQuery.data?.status === "completed" || requestQuery.data?.status === "failed") {
      void queryClient.invalidateQueries({ queryKey: ["recommendations", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["recommendations", "stats"] });
    }
  }, [queryClient, requestQuery.data]);

  const displayedQueueCount =
    requestQuery.data?.status === "pending" || requestQuery.data?.status === "processing"
      ? Math.max(statsQuery.data?.queued ?? 0, 1)
      : (statsQuery.data?.queued ?? 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] p-4 md:p-7">
      <section className="grid min-h-[calc(100vh-32px)] overflow-hidden rounded-ui border border-border bg-white/72 shadow-panel backdrop-blur-xl md:min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] lg:grid-cols-[360px_minmax(0,1fr)] dark:border-white/10 dark:bg-white/[0.05]">
        <PromptHistory
          activeId={activeId}
          isClearing={clearHistoryMutation.isPending}
          isLoading={historyQuery.isLoading}
          items={historyQuery.data ?? []}
          onClear={() => clearHistoryMutation.mutate()}
          onSelect={setActiveId}
        />

        <section className="min-h-0 overflow-y-auto p-5 md:p-8">
          <div className="grid content-start gap-5">
            <section className="grid gap-5 rounded-ui border border-border bg-white p-6 dark:border-white/10 dark:bg-[#0c1726]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="mb-2 text-xs font-extrabold uppercase text-accent">Запрос к агенту</p>
                  <h2 className="text-2xl font-extrabold leading-tight md:text-3xl">
                    Опишите задачу для облака
                  </h2>
                </div>
                <ThemeSwitcher
                  theme={theme}
                  viewMode={viewMode}
                  onThemeChange={setTheme}
                  onViewModeChange={setViewMode}
                />
              </div>
              <PromptForm
                isSubmitting={createMutation.isPending}
                queueCount={displayedQueueCount}
                onSubmit={(prompt) => createMutation.mutate({ prompt })}
              />
              {createMutation.isError ? (
                <div className="inline-flex items-start gap-2 rounded-ui border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                  Не удалось отправить запрос. Проверьте backend и попробуйте снова.
                </div>
              ) : null}
            </section>

            {requestQuery.isError ? (
              <div className="rounded-ui border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
                Не удалось получить результат запроса.
              </div>
            ) : null}

            <RecommendationResults
              isFetching={requestQuery.isFetching}
              request={requestQuery.data}
              viewMode={viewMode}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
