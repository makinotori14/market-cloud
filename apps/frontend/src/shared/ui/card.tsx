import * as React from "react";
import { cn } from "@/shared/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-ui border border-border bg-white text-foreground dark:border-white/10 dark:bg-[#0c1726] dark:text-white",
        className,
      )}
      {...props}
    />
  );
}
