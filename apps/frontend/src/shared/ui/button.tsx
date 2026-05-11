import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-ui px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-white shadow-[0_14px_28px_rgba(7,17,31,0.20)] hover:bg-[#063b6f] dark:bg-[#45bfff] dark:text-[#03101f] dark:shadow-[0_14px_28px_rgba(0,167,232,0.18)] dark:hover:bg-[#7bd5ff]",
        secondary:
          "border border-border bg-white text-foreground hover:border-accent/60 hover:bg-[#f8fcff] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:border-accent/70 dark:hover:bg-white/[0.13]",
        ghost:
          "text-muted hover:bg-[#eef8ff] hover:text-[#063b6f] dark:text-white/86 dark:hover:bg-white/10 dark:hover:text-white",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);

Button.displayName = "Button";
