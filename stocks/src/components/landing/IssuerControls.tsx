import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pause,
  ShieldAlert,
  ShieldOff,
  Snowflake,
  Undo2,
  Unplug,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";
import { ISSUER_DOCS_URL } from "./links";

type Group = "powers" | "refused" | "account";
type Filter = Group | "all";

/*
 * What an issuer, or the holder's own wallet, can do to a covered position,
 * as the app classifies it: the risk legend on /browse and /dashboard, the
 * blockers that refuse a cover, and the two account states the dashboard
 * repairs or explains.
 */
const ITEMS: readonly { key: string; group: Group; Icon: LucideIcon }[] = [
  { key: "clawback", group: "powers", Icon: Undo2 },
  { key: "pausable", group: "powers", Icon: Pause },
  { key: "freezable", group: "powers", Icon: Snowflake },
  { key: "hookSlot", group: "powers", Icon: Webhook },
  { key: "frozenDefault", group: "refused", Icon: Lock },
  { key: "liveHook", group: "refused", Icon: Ban },
  { key: "unregistered", group: "refused", Icon: ShieldOff },
  { key: "eviction", group: "account", Icon: Unplug },
  { key: "cpiGuard", group: "account", Icon: ShieldAlert },
];

const FILTERS: readonly Filter[] = ["all", "powers", "refused", "account"];

/**
 * The issuer's powers as a filterable carousel. The rail scrolls natively —
 * touch, trackpad, or keyboard once focused — and the two buttons step it one
 * card at a time.
 */
export const IssuerControls: React.FC = () => {
  const { t } = useTranslation("stocks");
  const [filter, setFilter] = useState<Filter>("all");
  const [edges, setEdges] = useState({ start: true, end: false });
  const rail = useRef<HTMLUListElement>(null);
  const shown = ITEMS.filter((item) => filter === "all" || item.group === filter);

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const sizes = new ResizeObserver(measure);
    sizes.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      sizes.disconnect();
    };
  }, [filter, measure]);

  const step = (direction: 1 | -1) => {
    const el = rail.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const navButton =
    "grid h-11 w-11 place-items-center rounded-full border border-foreground/20 bg-background transition-colors duration-100 ease-out hover:border-foreground/55 disabled:pointer-events-none disabled:opacity-35";

  return (
    <section id="issuers" className="hs-col scroll-mt-24">
      <h2 className="hs-h2">{t("landing.issuers.title")}</h2>
      <p className="mt-4 max-w-[36rem] text-[0.975rem] leading-relaxed text-foreground/80">
        <span aria-hidden="true">* </span>
        {t("landing.issuers.note")}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label={t("landing.issuers.filterLabel")} className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "hs-mono-xs h-10 rounded-full border px-4 transition-colors duration-100 ease-out",
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 bg-background hover:border-foreground/55",
              )}
            >
              {t(`landing.issuers.filters.${f}`)}
            </button>
          ))}
        </div>
        <a href={ISSUER_DOCS_URL} className="hs-mono inline-flex items-center gap-1.5 hover:underline">
          {t("landing.issuers.more")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <ul
        ref={rail}
        tabIndex={0}
        aria-label={t("landing.issuers.title")}
        className="hs-rail mt-6 rounded-[var(--hs-radius)]"
      >
        {shown.map(({ key, group, Icon }) => (
          <li key={key} className="hs-card flex min-h-[16rem] flex-col justify-between gap-10 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-tile-line bg-background">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="hs-h3">{t(`landing.issuers.${key}.title`)}</h3>
            </div>
            <div>
              <span className="hs-mono-xs inline-flex rounded-md border border-tile-line bg-background px-2 py-0.5 text-muted-foreground">
                {t(`landing.issuers.filters.${group}`)}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                {t(`landing.issuers.${key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={edges.start}
          aria-label={t("landing.issuers.previous")}
          className={navButton}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={edges.end}
          aria-label={t("landing.issuers.next")}
          className={navButton}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
