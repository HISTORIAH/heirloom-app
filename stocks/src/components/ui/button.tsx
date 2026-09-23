import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The stocks UI's one button: the pill from styles/stocks.css, which the
 * landing's links use directly. Yellow is the page's main action, ink a
 * secondary one that still has weight, ghost everything else.
 *
 * This file no longer matches app/'s copy — the stocks origin has its own
 * visual language — so don't sync the two back together.
 */
const buttonVariants = cva("hs-btn", {
  variants: {
    variant: {
      primary: "hs-btn-primary",
      ink: "hs-btn-ink",
      ghost: "hs-btn-ghost",
      quiet: "hs-btn-quiet",
    },
    size: {
      sm: "hs-btn-sm",
      default: "",
      lg: "hs-btn-lg",
      icon: "hs-btn-icon",
    },
  },
  defaultVariants: {
    variant: "ghost",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
