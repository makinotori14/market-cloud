"use client";

import { FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

type PromptFormProps = {
  isSubmitting: boolean;
  prompt: string;
  queueCount: number;
  onPromptChange: (prompt: string) => void;
  onSubmit: (prompt: string) => void;
};

export function PromptForm({
  isSubmitting,
  prompt,
  queueCount,
  onPromptChange,
  onSubmit,
}: PromptFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(prompt);
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="prompt">
        Промпт
      </label>
      <Textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Опишите задачу, ограничения, нагрузку, требования к данным и инфраструктуре..."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex min-h-10 items-center gap-3 text-sm font-semibold text-muted dark:text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_6px_rgba(0,167,232,0.12)] dark:shadow-[0_0_0_7px_rgba(0,167,232,0.22)]" />
          <span>В очереди: {queueCount}</span>
        </div>
        <Button disabled={isSubmitting || prompt.trim().length < 8} type="submit">
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Отправляем" : "Найти решения"}
        </Button>
      </div>
    </form>
  );
}
