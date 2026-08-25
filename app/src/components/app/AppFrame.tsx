import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import GridRules from "@/components/landing/GridRules";
import { cn } from "@/lib/utils";

/**
 * The running head of an app screen — the same device the landing announces
 * its sections with: the screen is named at the left margin, a rule runs out
 * to the right, and the screen's own controls sit at the far end.
 */
export const PageHead = ({
  label,
  meta,
  backTo,
  backLabel,
  right,
}: {
  label: ReactNode;
  /** A second, quieter line: a count, a state, an address. */
  meta?: ReactNode;
  backTo?: string;
  backLabel?: string;
  right?: ReactNode;
}) => {
  const navigate = useNavigate();

  return (
    <div className="app-head">
      {backTo ? (
        <button
          onClick={() => navigate(backTo)}
          className="group -ml-1 flex shrink-0 items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2}
          />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
      ) : null}

      <span className="cap cap-ink shrink-0">{label}</span>
      {meta ? <span className="cap shrink-0 truncate">{meta}</span> : null}
      <span aria-hidden="true" className="app-head-rule" />
      {right ? <div className="ml-auto flex items-center gap-2 md:ml-0">{right}</div> : null}
    </div>
  );
};

/**
 * How wide the working measure is. The page itself always runs edge to edge —
 * the nav, the running head and the column rules are the window's, not the
 * content's — but the content sits in a centred measure inside it, so a screen
 * reads as a composed page rather than as a form stretched to the monitor.
 */
const MEASURE = {
  wide: "max-w-6xl",
  narrow: "max-w-4xl",
  full: "max-w-none",
} as const;

/**
 * Every app screen sits on the same ruled page as the landing: the shared nav
 * on top, the column rules drawn once behind the whole scroll, and the content
 * centred between them.
 */
const AppFrame = ({
  children,
  head,
  measure = "wide",
  className,
  bodyClassName,
}: {
  children: ReactNode;
  head?: ReactNode;
  /** "wide" for dense screens (the dashboard, the wizard), "narrow" for the portals. */
  measure?: keyof typeof MEASURE;
  className?: string;
  bodyClassName?: string;
}) => (
  <div className={cn("app-page", className)}>
    <NavBar />
    {/* The ruling runs at least to the fold even on a short screen, so the
        column rules read as the page's geometry rather than as a box drawn
        around whatever content happens to be there. */}
    <div className="relative min-h-[calc(100svh-var(--nav-h))]">
      <GridRules />
      <div className="relative z-10">
        {head}
        <main className={cn("app-body", bodyClassName)}>
          <div className={cn("mx-auto w-full", MEASURE[measure])}>{children}</div>
        </main>
      </div>
    </div>
  </div>
);

export default AppFrame;
