import { createContext, useContext, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, toneCap, type TileTone } from "@/components/landing/tones";

/**
 * The landing page is a mosaic: tiles of uneven size and weight placed on a
 * 12-column grid, rather than equal cells in a rigid band. `Mosaic` owns the
 * grid; `Tile` owns one block's span, fill, and padding.
 *
 * Span is handed to CSS as `--col` / `--row` custom properties so Tailwind
 * never needs to see a dynamic class name. The responsive collapse lives in
 * index.css alongside the grid itself.
 */

const IndexContext = createContext<{ next: () => number } | null>(null);

export const Mosaic = ({
  children,
  className,
  cols,
  band,
}: {
  children: ReactNode;
  className?: string;
  /** Column count for the band. 12 unless the section divides evenly by something else. */
  cols?: number;
  /**
   * Width ÷ height the band wants at desktop. Without it the grid stretches to
   * whatever height is going, which turns wide tiles into tall empty ones.
   */
  band?: number;
}) => {
  // Each tile asks for its position in reading order so the entrance stagger
  // runs across the whole mosaic without every section hand-numbering itself.
  const counter = useRef(0);
  counter.current = 0;

  return (
    <IndexContext.Provider value={{ next: () => counter.current++ }}>
      <div
        style={
          {
            ...(cols ? { "--cols": cols } : {}),
            ...(band ? { "--band": band } : {}),
          } as CSSProperties
        }
        className={cn("mosaic", className)}
      >
        {children}
      </div>
    </IndexContext.Provider>
  );
};

export interface TileProps {
  /** Column span out of 12 at lg and up. */
  col: number;
  /** Row span, one row being 5.5rem. Ignored below lg, where rows go auto. */
  row: number;
  /** Column span out of 6 between sm and lg. Defaults to the full width. */
  colMd?: number;
  tone?: TileTone;
  className?: string;
  children: ReactNode;
  /** Drop the default padding — for tiles that manage their own. */
  bare?: boolean;
}

export const Tile = ({
  col,
  row,
  colMd = 6,
  tone = "paper",
  className,
  children,
  bare = false,
}: TileProps) => {
  const ctx = useContext(IndexContext);
  const i = ctx ? ctx.next() : 0;

  return (
    <div
      style={
        {
          "--col": col,
          "--row": row,
          "--col-md": colMd,
          "--i": i,
        } as CSSProperties
      }
      className={cn(
        "tile-rise flex min-h-0 flex-col justify-between overflow-hidden",
        // Boxes sit inside the ruling, so they are softened; a `plain` tile has
        // no fill to round, and its type sits directly on the ruled page.
        tone !== "plain" && "rounded-xl",
        // Padding opens up with the page: at full bleed a tile is a large
        // field, and 1.75rem of it reads as a hairline margin.
        !bare && "p-6 md:p-8 xl:p-9 2xl:p-11",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </div>
  );
};

/** The small uppercase label most tiles open with. */
export const Cap = ({
  tone = "paper",
  children,
  className,
}: {
  tone?: TileTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "text-[11px] font-bold uppercase tracking-[0.18em] md:text-xs",
      toneCap[tone],
      className,
    )}
  >
    {children}
  </span>
);
