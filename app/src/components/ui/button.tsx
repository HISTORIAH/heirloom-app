import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * One button language for the whole product: a hairline box that fills, and
 * fills that darken. No offset shadow and no travel on press — the page is
 * flat paper, so a control announces itself by weight of fill, not by depth.
 *
 * Disabled is one state for every variant: the control drops back to soft
 * paper rather than becoming a faded version of its own colour, which is how
 * a greyed-out ink button ends up reading as a solid grey slab.
 *
 * Fills carry meaning and are not interchangeable: ink is the default action,
 * yellow is the one promoted action on a screen, sage means alive, red means
 * irreversible. Everything else is a hairline outline or plain type.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-bold uppercase tracking-[0.12em] transition-colors duration-150 ease-out disabled:pointer-events-none disabled:border-tile-line disabled:bg-tile-soft disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-foreground bg-foreground text-background hover:bg-foreground/85",
        yellow: "border-accent-yellow bg-accent-yellow text-foreground hover:brightness-95",
        // Alive, and only alive: the check-in, the live state, the confirmation.
        sage: "border-accent-sage bg-accent-sage text-foreground hover:brightness-95",
        outline:
          "border-foreground/25 bg-background text-foreground hover:border-foreground hover:bg-tile-soft",
        soft: "border-tile-line bg-tile-soft text-foreground hover:bg-secondary",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-tile-soft",
        link: "border-transparent bg-transparent text-foreground underline-offset-4 hover:underline",
        destructive:
          "border-accent-red bg-accent-red text-background hover:brightness-95",
        // Irreversible, but not yet chosen — the danger action at rest.
        "destructive-outline":
          "border-accent-red/40 bg-background text-accent-red hover:border-accent-red hover:bg-accent-red hover:text-background",
        // Landing aliases. Kept so the marketing page keeps its exact look.
        flat: "border-0 bg-foreground text-background hover:bg-foreground/85",
        "flat-inverse": "border-0 bg-background text-foreground hover:bg-background/85",
        "flat-yellow": "border-0 bg-accent-yellow text-foreground hover:brightness-95",
        "flat-outline":
          "border-[1.5px] border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        // Legacy colour names, folded onto the new palette so no screen can
        // reintroduce a colour the page does not have.
        pink: "border-accent-yellow bg-accent-yellow text-foreground hover:brightness-95",
        cyan: "border-accent-sky bg-accent-sky text-foreground hover:brightness-95",
        orange: "border-accent-yellow bg-accent-yellow text-foreground hover:brightness-95",
        purple: "border-foreground bg-foreground text-background hover:bg-foreground/85",
        pill: "rounded-full border-foreground/25 bg-background text-foreground hover:border-foreground hover:bg-tile-soft",
        "pill-dark": "rounded-full border-foreground bg-foreground text-background hover:bg-foreground/85",
      },
      size: {
        default: "h-11 px-5 text-xs",
        sm: "h-9 px-3.5 text-[11px]",
        lg: "h-14 px-10 text-base",
        xl: "h-14 px-8 text-sm",
        icon: "h-10 w-10 p-0",
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

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
