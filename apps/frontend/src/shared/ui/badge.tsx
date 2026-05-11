import * as React from "react";
import { cn } from "@/shared/lib/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-ui border border-[#ccecff] bg-[#e9f7ff] px-2 py-1 text-xs font-bold text-[#063b6f] dark:border-white/10 dark:bg-white/[0.08] dark:text-white",
        className,
      )}
      {...props}
    />
  );
}
