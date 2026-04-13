import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold uppercase tracking-wide border-4 border-foreground transition-all duration-150 ease-out focus-visible:outline-4 focus-visible:outline-foreground focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        lime: "bg-accent-lime text-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        pink: "bg-accent-pink text-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        cyan: "bg-accent-cyan text-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        orange: "bg-accent-orange text-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        purple: "bg-accent-purple text-primary-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        yellow: "bg-accent-yellow text-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        outline: "bg-background text-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        destructive: "bg-accent-red text-primary-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[8px_8px_0px_0px_hsl(var(--foreground))] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]",
        ghost: "border-transparent hover:bg-secondary",
        link: "border-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm",
        sm: "h-10 px-4 py-2 text-xs",
        lg: "h-14 px-10 py-4 text-base",
        xl: "h-16 px-12 py-5 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

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

export { Button, buttonVariants };
