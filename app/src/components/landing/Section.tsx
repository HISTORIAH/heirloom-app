import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One landing section as an editorial spread: full window width, at least a
 * full viewport tall, with a running head across the top and the section's
 * mosaic centred in whatever height is left.
 *
 * The running head carries the eyebrow that used to sit inside the first tile.
 * Moving it out to the page edge is the point — the section is announced at
 * the margin, and the composition below it starts on the headline.
 */
const Section = ({
  id,
  index,
  label,
  total,
  tall,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  /** Position in the argument, printed as the folio. */
  index: number;
  /** Section name, uppercase in the running head. */
  label: string;
  total: number;
  /** Opt out of the one-screen cap — for a section whose content genuinely runs long. */
  tall?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) => (
  <section id={id} data-tall={tall ? "" : undefined} className={cn("section-full", className)}>
    <div className="section-head">
      <span className="font-display text-[13px] font-bold leading-none tracking-[-0.01em] tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <span className="text-[11px] font-bold uppercase leading-none tracking-[0.18em]">
        {label}
      </span>
      <span aria-hidden="true" className="section-head-rule" />
      <span className="hidden text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-muted-foreground sm:block">
        Heirloom
      </span>
      <span className="text-[11px] font-bold leading-none tracking-[0.14em] text-muted-foreground tabular-nums">
        {String(index).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
    </div>

    <div className={cn("section-body", bodyClassName)}>
      <div className="section-inner">{children}</div>
    </div>
  </section>
);

/**
 * The band a section opens on: headline across the left of the page, lede set
 * against the right margin. It sits above the mosaic rather than inside it —
 * a headline is type on the page, and giving it grid rows of its own only
 * bought empty space once sections started filling the screen.
 */
export const SectionLead = ({
  headline,
  lede,
  className,
}: {
  headline: ReactNode;
  lede?: ReactNode;
  className?: string;
}) => (
  <div className={cn("grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-end lg:gap-8", className)}>
    <h2 className="ed-h2 lg:col-span-7">{headline}</h2>
    {lede ? (
      <p className="ed-lede max-w-[46ch] text-muted-foreground lg:col-span-5 lg:ml-auto lg:text-right">
        {lede}
      </p>
    ) : null}
  </div>
);

/**
 * A footnote under a section's band — the guardian rule, the emergency exit.
 *
 * It sits outside the mosaic on purpose: given a grid row it would be handed a
 * full share of the screen and become a mostly empty box. For the same reason
 * it is sized to its own copy and centred rather than stretched across the
 * page — a sentence ruled out to full bleed is mostly empty box in the other
 * direction, with the type stranded at the left end of it.
 */
export const SectionNote = ({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "mx-auto flex w-fit max-w-[68ch] items-start gap-4 rounded-xl border border-tile-line bg-background px-6 py-5 md:gap-5 md:px-8 md:py-6",
      className,
    )}
  >
    <Icon className="mt-0.5 h-6 w-6 shrink-0 md:h-7 md:w-7" strokeWidth={2} />
    <p className="ed-body text-foreground/75">
      <span className="font-bold uppercase tracking-[0.1em] text-foreground">{label}</span>{" "}
      — {children}
    </p>
  </div>
);

export default Section;
