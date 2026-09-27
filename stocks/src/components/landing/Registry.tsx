import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@heirloom/i18n";
import { useCatalog } from "@/hooks/useStocks";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogEntry, CatalogIssuer } from "@/services/catalog";
import { featuredListings } from "./links";

const ISSUERS: readonly CatalogIssuer[] = ["xstocks", "ondo"];

/**
 * Logo tiles on the wall: seven columns by four rows from md, with the last
 * cell counting the rest; four by five on phones, which hide the tail.
 */
const SHOWN = 27;
const SHOWN_PHONE = 19;

/** How often one tile turns over to another listing from the catalogue. */
const SWAP_MS = 2400;

/** A listing's name without the issuer's suffix; the ticker already says whose it is. */
const plainName = (name: string) =>
  name.replace(/\s*\(Ondo Tokenized\)$/, "").replace(/\s+xStock$/, "");

/** A stable scramble, so the wall isn't all A's and reads the same on every visit. */
const scramble = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * An issuer's catalogue in wall order: the featured names first, then every
 * other listing with a logo, scrambled. The first `SHOWN` go up; the rest
 * turn over into the wall one at a time.
 */
const wallOrder = (entries: CatalogEntry[], issuer: CatalogIssuer) => {
  const featured = featuredListings(entries, issuer).filter((e) => e.logo);
  const seen = new Set(featured.map((e) => e.mint));
  const rest = entries
    .filter((e) => e.issuer === issuer && e.logo && !seen.has(e.mint))
    .sort((a, b) => scramble(a.symbol) - scramble(b.symbol));
  return [...featured, ...rest];
};

/** One tile: the listing's logo and ticker, rising in whenever the listing changes. */
const Tile: React.FC<{
  entry: CatalogEntry;
  delay: number;
  onPoint: (entry: CatalogEntry | null) => void;
  className?: string;
}> = ({ entry, delay, onPoint, className }) => {
  // Only the listing the tile was mounted with waits its turn in the cascade;
  // a swapped-in one rises straight away.
  const first = useRef(entry.mint);
  const [broken, setBroken] = useState(false);

  return (
    <li
      onPointerEnter={() => onPoint(entry)}
      className={cn(
        "grid aspect-square place-items-center rounded-xl border border-tile-line bg-tile-soft",
        className,
      )}
    >
      <div
        key={entry.mint}
        className="hs-rise flex w-full min-w-0 flex-col items-center gap-1.5 px-1"
        style={first.current === entry.mint ? { animationDelay: `${delay}ms` } : undefined}
      >
        {broken || !entry.logo ? (
          <span className="grid aspect-square w-1/2 place-items-center rounded-full border border-tile-line bg-background text-sm font-medium">
            {entry.symbol.charAt(0)}
          </span>
        ) : (
          <img
            src={entry.logo}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="aspect-square w-1/2 rounded-full border border-tile-line bg-background object-cover"
          />
        )}
        <span className="hs-mono-xs max-w-full truncate text-foreground/75">{entry.symbol}</span>
      </div>
    </li>
  );
};

/**
 * The issuer registry, with the logos it admits. The two entries sit on one
 * side as a switch; the other side is a wall of the chosen issuer's listings,
 * a tile each, best known first. While it's on screen one tile at a time
 * turns over to another listing, so the wall works through the whole
 * catalogue rather than stopping at the first few. Every count is read from
 * the catalogue.
 */
export const Registry: React.FC = () => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const catalog = useCatalog();
  const panel = useRef<HTMLDivElement>(null);
  const [issuer, setIssuer] = useState<CatalogIssuer>("xstocks");
  const [pointed, setPointed] = useState<CatalogEntry | null>(null);

  const orders = useMemo(
    () => Object.fromEntries(ISSUERS.map((i) => [i, wallOrder(catalog.entries, i)])),
    [catalog.entries],
  ) as Record<CatalogIssuer, CatalogEntry[]>;
  const order = orders[issuer];

  const totals = useMemo(() => {
    const byIssuer = Object.fromEntries(
      ISSUERS.map((i) => [i, catalog.entries.filter((e) => e.issuer === i).length]),
    ) as Record<CatalogIssuer, number>;
    const listedBy = new Map<string, Set<CatalogIssuer>>();
    for (const e of catalog.entries) {
      if (!e.underlying) continue;
      listedBy.set(e.underlying, (listedBy.get(e.underlying) ?? new Set()).add(e.issuer));
    }
    const both = [...listedBy.values()].filter((s) => s.size === ISSUERS.length).length;
    return { byIssuer, companies: listedBy.size, both };
  }, [catalog.entries]);

  // The wall holds indices into the issuer's order, and `next` is the next
  // listing to turn over into it. Turnover is kept against the order it was
  // made in, so a new issuer (or the catalogue arriving) starts a fresh wall
  // in the same render instead of flashing the old one.
  const fresh = useMemo(
    () => ({ order, slots: order.slice(0, SHOWN).map((_, i) => i), next: SHOWN }),
    [order],
  );
  const [turned, setTurned] = useState(fresh);
  const wall = turned.order === order ? turned.slots : fresh.slots;

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const seen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.35,
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || order.length <= SHOWN) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = -1;
    const id = window.setInterval(() => {
      const room = window.matchMedia("(min-width: 768px)").matches ? SHOWN : SHOWN_PHONE;
      let slot = Math.floor(Math.random() * room);
      if (slot === last) slot = (slot + 1) % room;
      last = slot;
      setTurned((current) => {
        const from = current.order === order ? current : fresh;
        const up = new Set(from.slots);
        let pick = from.next % order.length;
        while (up.has(pick)) pick = (pick + 1) % order.length;
        return {
          order,
          slots: from.slots.map((at, i) => (i === slot ? pick : at)),
          next: pick + 1,
        };
      });
    }, SWAP_MS);
    return () => window.clearInterval(id);
  }, [visible, order, fresh]);

  const count = (n: number) => formatNumber(n, locale);
  const ready = catalog.count > 0;
  const total = totals.byIssuer[issuer];

  return (
    <section className="hs-col">
      <span className="hs-tag hs-mono-xs">{t("landing.catalog.tag")}</span>
      <h2 className="hs-h2 mt-5 whitespace-pre-line">{t("landing.catalog.title")}</h2>
      <p className="mt-5 max-w-[31rem] text-pretty text-[0.975rem] leading-relaxed text-foreground/80">
        {t("landing.catalog.body")}
      </p>

      {/* Same split as How it works: the entries take a third on xl, the wall
          two thirds; below xl the wall runs full width under them. */}
      <div className="hs-sheet mt-10 grid overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col">
          <div
            role="group"
            aria-label={t("landing.catalog.issuerLabel")}
            className="grid md:grid-cols-2 xl:grid-cols-1"
          >
            {ISSUERS.map((it, n) => (
              <button
                key={it}
                type="button"
                aria-pressed={it === issuer}
                onClick={() => {
                  setIssuer(it);
                  setPointed(null);
                }}
                className={cn(
                  "grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline px-5 py-5 text-left transition-opacity duration-300 sm:px-6",
                  n > 0 &&
                    "border-t border-tile-line md:border-l md:border-t-0 xl:border-l-0 xl:border-t",
                  it !== issuer && "opacity-40 hover:opacity-70",
                )}
              >
                <span className="hs-mono-xs text-muted-foreground">0{n + 1}</span>
                <span className="text-[0.9375rem] font-medium">{t(`browse.issuers.${it}`)}</span>
                <span className="text-right">
                  <span className="hs-figure block text-[1.75rem]">
                    {ready ? count(totals.byIssuer[it]) : "–"}
                  </span>
                  <span className="hs-mono-xs mt-1 block text-muted-foreground">
                    {t("landing.catalog.listings")}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {ready && (
            <div className="hs-mono-xs mt-auto border-t border-tile-line px-5 py-4 text-muted-foreground sm:px-6">
              <p>{t("landing.catalog.companies", { formatted: count(totals.companies) })}</p>
              <p>{t("landing.catalog.both", { formatted: count(totals.both) })}</p>
            </div>
          )}
        </div>

        <div
          ref={panel}
          className="flex min-h-[22rem] flex-col gap-4 border-t border-tile-line px-5 py-5 sm:px-6 xl:border-l xl:border-t-0"
          onPointerLeave={() => setPointed(null)}
        >
          <div className="hs-mono-xs flex min-w-0 justify-between gap-4 text-muted-foreground">
            <span className="shrink-0">{t(`browse.issuers.${issuer}`)}</span>
            <span className="truncate text-foreground/75">
              {pointed ? plainName(pointed.name) : ""}
            </span>
          </div>
          {ready && (
            <ul key={issuer} className="grid grid-cols-4 gap-2 md:grid-cols-7">
              {wall.map((at, i) => (
                <Tile
                  key={i}
                  entry={order[at]}
                  delay={i * 22}
                  onPoint={setPointed}
                  className={cn(i >= SHOWN_PHONE && "max-md:hidden")}
                />
              ))}
              {/* The rest of the catalogue, counted for the tiles each width shows. */}
              <li className="flex aspect-square flex-col items-center justify-center rounded-xl border border-tile-line">
                <span className="hs-figure text-[1.25rem] md:hidden">
                  +{count(Math.max(total - SHOWN_PHONE, 0))}
                </span>
                <span className="hs-figure text-[1.25rem] max-md:hidden">
                  +{count(Math.max(total - SHOWN, 0))}
                </span>
                <span className="hs-mono-xs mt-1 text-muted-foreground">
                  {t("landing.catalog.more")}
                </span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
