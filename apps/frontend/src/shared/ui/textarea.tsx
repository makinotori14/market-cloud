import * as React from "react";
import { cn } from "@/shared/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-36 w-full resize-y rounded-ui border border-[#cfe4f4] bg-[#f8fcff] px-4 py-4 text-base text-foreground outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/78 dark:focus:bg-white/[0.06]",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
