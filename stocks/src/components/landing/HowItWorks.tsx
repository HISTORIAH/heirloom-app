import { useEffect, useRef, useState } from "react";
import { Heart, Lock, Wallet, X } from "lucide-react";
import { EXIT_FEE_BPS, RECOVERY_FEE_BPS } from "@historiah/heirloom-stocks";
import { useTranslation } from "@heirloom/i18n";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Connector } from "./Primitives";

type Mode = "backup" | "vault";
const MODES: readonly Mode[] = ["backup", "vault"];
const STEPS = ["a", "b", "c"] as const;

/** Every beat of a loop names the step it belongs to, and how long it holds. */
type Beat = { step: number; ms: number };

/* ----------------------------------------------------------------- vault
   Three stops, and a dot carrying the holding from one to the next. The lit
   stop is the beat's step. */

const STOPS = ["you", "plan", "to"] as const;
const STOP_ICONS = [Wallet, Lock, Heart] as const;

/** Which link the dot is on, how far along it (0 or 1), and whether it shows. */
type FlowBeat = Beat & { link: number; at: 0 | 1; dot: boolean };

const FLOW: FlowBeat[] = [
  { step: 0, link: 0, at: 0, dot: false, ms: 1400 },
  { step: 0, link: 0, at: 0, dot: true, ms: 250 },
  { step: 0, link: 0, at: 1, dot: true, ms: 950 },
  { step: 1, link: 0, at: 1, dot: false, ms: 1400 },
  { step: 1, link: 1, at: 0, dot: true, ms: 250 },
  { step: 1, link: 1, at: 1, dot: true, ms: 950 },
  { step: 2, link: 1, at: 1, dot: false, ms: 2600 },
];

/** Under reduced motion the flow holds still: the last hand-off mid-way, its end lit. */
const FLOW_STILL: FlowBeat = { step: 2, link: 1, at: 1, dot: true, ms: 0 };

const TRAVEL = "950ms cubic-bezier(0.65, 0, 0.35, 1)";

/* ---------------------------------------------------------------- backup
   A run of check-ins out of your wallet until the key is lost, then the
   interval and grace period lapsing, then the covered stocks landing in the
   backup wallet. Your wallet stays lit until they do: they never leave it
   before then. */

/** How long the check-ins take to run out along the line, and the lapse after. */
const RUN_MS = 1800;
const LAPSE_MS = 1300;

/** Where the key is lost, as a share of the timeline, and the check-ins evenly before it. */
const BREAK = 62;
const CHECK_INS = [BREAK / 3, (BREAK * 2) / 3];

/** Example holdings for the backup wallet, all in the catalogue. */
const HELD = ["AAPLx", "NVDAx", "SPYx"];

/** Whether the check-ins have run, the key is lost, the lapse is over, the wallet paid. */
type LineBeat = Beat & {
  run: boolean;
  lost: boolean;
  lapsed: boolean;
  paid: boolean;
  out?: boolean;
};

const LINE: LineBeat[] = [
  { step: 0, run: false, lost: false, lapsed: false, paid: false, ms: 900 },
  { step: 1, run: true, lost: false, lapsed: false, paid: false, ms: RUN_MS },
  { step: 1, run: true, lost: true, lapsed: false, paid: false, ms: 750 },
  { step: 2, run: true, lost: true, lapsed: true, paid: false, ms: LAPSE_MS },
  { step: 2, run: true, lost: true, lapsed: true, paid: true, ms: 2100 },
  { step: 2, run: true, lost: true, lapsed: true, paid: false, out: true, ms: 400 },
];

const LINE_STILL: LineBeat = { step: 2, run: true, lost: true, lapsed: true, paid: true, ms: 0 };

/**
 * Steps through a script while the panel is on screen, never under reduced
 * motion. `loop` counts the times it has started over, so a caller can
 * remount what should reset in place rather than animate back.
 */
const useLoop = (panel: React.RefObject<HTMLElement | null>, script: readonly Beat[]) => {
  const [i, setI] = useState(0);
  const [loop, setLoop] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(query.matches);
    sync();
    query.addEventListener("change", sync);
    const seen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.35,
    });
    if (panel.current) seen.observe(panel.current);
    return () => {
      query.removeEventListener("change", sync);
      seen.disconnect();
    };
  }, [panel]);

  const playing = visible && !reduce;
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      if (i + 1 < script.length) setI(i + 1);
      else {
        setI(0);
        setLoop((n) => n + 1);
      }
    }, script[i]?.ms ?? 0);
    return () => window.clearTimeout(id);
  }, [i, playing, script]);

  const restart = () => {
    setI(0);
    setLoop((n) => n + 1);
  };
  return { i, loop, restart, reduce };
};

/** A stop's card, washed sage while the holding is with it. */
const Card: React.FC<{ lit: boolean; className?: string; children: React.ReactNode }> = ({
  lit,
  className,
  children,
}) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-xl border bg-tile-soft transition-colors duration-500 md:aspect-square",
      lit ? "border-[hsl(var(--hs-sage-line)/0.45)]" : "border-tile-line",
      className,
    )}
  >
    {/* The sage wash sits on the opaque card, so the page rules stay hidden. */}
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 bg-accent-sage/40 transition-opacity duration-500",
        lit ? "opacity-100" : "opacity-0",
      )}
    />
    {children}
  </div>
);

/**
 * The arrow between two stops, labelled with the step that crosses it. The
 * dot rides it when a holding changes hands.
 */
const Link: React.FC<{
  label: string;
  at: number;
  dot: boolean;
  still: boolean;
  vertical?: boolean;
  className?: string;
}> = ({ label, at, dot, still, vertical, className }) => {
  // Mid-way when still, so the frame reads as a hand-off in progress.
  const along = `calc(${still ? 0.55 : at} * (100% - 1.125rem))`;
  const axis = vertical ? "top" : "left";

  return (
    <div
      aria-hidden="true"
      className={cn(
        // Across, the label sits in the top of three rows so the line stays
        // centred on the stops either side.
        vertical ? "relative flex h-12 justify-center" : "grid-rows-[1fr_auto_1fr] px-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "hs-mono-xs text-muted-foreground",
          vertical
            ? "absolute left-1/2 top-1/2 ml-4 -translate-y-1/2"
            : "mb-1.5 self-end text-center",
        )}
      >
        {label}
      </span>
      <div className={cn("relative", vertical ? "h-full" : "w-full")}>
        <Connector down={vertical} className="h-full w-full" />
        <span
          className={cn(
            "absolute h-[9px] w-[9px] rounded-full bg-[hsl(var(--hs-sage-line))]",
            vertical ? "left-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2",
            dot ? "opacity-100" : "opacity-0",
          )}
          style={{
            [axis]: along,
            transition: still ? "none" : `${axis} ${TRAVEL}, opacity 200ms`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * The backup plan's clock as a line out of your wallet: check-ins until the
 * key is lost, then a hatched stretch where nobody checks in, running into
 * the backup wallet.
 */
const Timeline: React.FC<{
  beat: LineBeat;
  still: boolean;
  lost: string;
  className?: string;
}> = ({ beat, still, lost, className }) => {
  const motion = (css: string) => (still ? "none" : css);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-28 transition-opacity duration-300 md:h-full md:pr-3",
        beat.out && "opacity-0",
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 right-0 md:right-3">
        <span
          className={cn(
            "hs-mono absolute bottom-[calc(50%+1.375rem)] -translate-x-1/2 whitespace-nowrap text-[hsl(var(--hs-danger))] transition-opacity duration-300",
            beat.lost ? "opacity-100" : "opacity-0",
          )}
          style={{ left: `${BREAK}%` }}
        >
          {lost}
        </span>

        {/* The stretch nobody checks in for, revealed as the lapse runs. */}
        <div
          className="absolute top-1/2 h-8 -translate-y-1/2 rounded-r-full border border-l-0 border-tile-line"
          style={{
            left: `${BREAK}%`,
            right: 0,
            backgroundImage:
              "repeating-linear-gradient(135deg, hsl(var(--foreground) / 0.13) 0 1px, transparent 1px 7px)",
            clipPath: `inset(0 ${beat.lapsed ? 0 : 100}% 0 0)`,
            transition: motion(`clip-path ${LAPSE_MS}ms linear`),
          }}
        >
          <Connector className="absolute inset-x-0 top-1/2 -translate-y-1/2" />
        </div>

        {/* The check-ins, drawn out from your wallet to the break. */}
        <div
          className="absolute left-0 top-1/2 h-[3px] origin-left rounded-full bg-[hsl(var(--hs-sage-line))]"
          style={{
            width: `${BREAK}%`,
            transform: `translateY(-50%) scaleX(${beat.run ? 1 : 0})`,
            transition: motion(`transform ${RUN_MS}ms linear`),
          }}
        />
        {CHECK_INS.map((x) => {
          const on = beat.run;
          // Each check-in lands as the line reaches it.
          const delay = on ? (x / BREAK) * RUN_MS : 0;
          return (
            <span
              key={x}
              className="absolute top-1/2 h-4 w-4 rounded-full border border-foreground/55 bg-accent-sage shadow-[0_0_0_8px_hsl(var(--accent-sage)/0.45)]"
              style={{
                left: `${x}%`,
                opacity: on ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${on ? 1 : 0.4})`,
                transition: motion(`opacity 250ms ${delay}ms, transform 250ms ${delay}ms`),
              }}
            />
          );
        })}

        <span
          className="absolute top-1/2 grid h-[1.625rem] w-[1.625rem] place-items-center rounded-full border border-[hsl(var(--hs-danger))] bg-background text-[hsl(var(--hs-danger))]"
          style={{
            left: `${BREAK}%`,
            opacity: beat.lost ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${beat.lost ? 1 : 0.4})`,
            transition: motion("opacity 250ms, transform 250ms"),
          }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
};

/**
 * The two plan modes behind a switch: what each one is and its three steps,
 * beside a small loop of it at work, with the step it's on lit in the list.
 * Backup draws the check-in clock breaking and the covered stocks landing in
 * the backup wallet; vault carries a holding from you to the vault to your
 * heir. Every step is a real instruction in `programs/heirloom-stocks`, and
 * every fee a program constant.
 */
export const HowItWorks: React.FC = () => {
  const { t, i18n } = useTranslation("stocks");
  const [mode, setMode] = useState<Mode>("backup");
  const panel = useRef<HTMLDivElement>(null);
  const { i, loop, restart, reduce } = useLoop(panel, mode === "vault" ? FLOW : LINE);
  const flow = reduce ? FLOW_STILL : (FLOW[i] ?? FLOW[0]);
  const line = reduce ? LINE_STILL : (LINE[i] ?? LINE[0]);
  const step = mode === "vault" ? flow.step : line.step;

  const locale = i18n.resolvedLanguage ?? i18n.language;
  const fees = {
    recoveryFee: formatPercent(RECOVERY_FEE_BPS / 10_000, locale),
    exitFee: formatPercent(EXIT_FEE_BPS / 10_000, locale),
  };
  const k = (key: string, m: Mode = mode) => t(`landing.how.${m}.${key}`, fees);

  const select = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    restart();
  };

  const links = [0, 1].map((n) => ({
    label: k(`link${n + 1}`),
    at: flow.link === n ? flow.at : flow.link > n ? 1 : 0,
    dot: flow.dot && flow.link === n,
    still: reduce,
  }));

  const stop = (n: number, lit: boolean) => {
    const Icon = STOP_ICONS[n];
    return (
      <Card lit={lit}>
        <div className="relative flex h-full gap-3 p-3.5 md:flex-col md:justify-between md:p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-tile-line bg-background">
            <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[0.9375rem] font-medium leading-snug md:text-base">
              {k(`stops.${STOPS[n]}.title`)}
            </p>
            {/* Two lines held, so titles line up and the switch never resizes the flow. */}
            <p className="mt-1 min-h-[2.25rem] text-[0.8125rem] leading-snug text-foreground/70">
              {k(`stops.${STOPS[n]}.body`)}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <section id="how-it-works" className="hs-col scroll-mt-24">
      <span className="hs-tag hs-mono-xs">{t("landing.how.tag")}</span>
      <h2 className="hs-h2 mt-5">{t("landing.how.title")}</h2>
      <p className="mt-5 max-w-[31rem] text-pretty text-[0.975rem] leading-relaxed text-foreground/80">
        {t("landing.how.body")}
      </p>

      {/* The animation takes two thirds on xl: three squares need the width to
          hold their copy. The steps stack their detail to fit the third left. */}
      <div className="hs-sheet mt-10 grid overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <div role="group" aria-label={t("landing.how.modeLabel")} className="hs-seg">
              {MODES.map((m) => (
                <button key={m} type="button" aria-pressed={m === mode} onClick={() => select(m)}>
                  {k("title", m)}
                </button>
              ))}
            </div>
            {/* Two lines held for either mode, so the switch never resizes the card. */}
            <p className="mt-5 min-h-[3.25rem] max-w-[26rem] text-[0.9375rem] leading-relaxed text-foreground/80">
              {k("sub")}
            </p>
          </div>
          <ol className="mt-8 xl:mt-auto xl:pt-8">
            {STEPS.map((s, n) => (
              <li
                key={s}
                className={cn(
                  "grid grid-cols-[2rem_minmax(0,1fr)] items-baseline border-t border-tile-line px-5 py-3.5 transition-opacity duration-300 sm:px-6",
                  !reduce && step !== n && "opacity-40",
                )}
              >
                <span className="hs-mono-xs text-muted-foreground">0{n + 1}</span>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 xl:flex-col xl:items-start xl:gap-0.5">
                  <span className="text-[0.9375rem] font-medium">{k(s)}</span>
                  <span className="hs-mono-xs text-muted-foreground">{k(`${s}Sub`)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Squares in a row from md, full width under the steps until xl; on
            phones they stack as compact rows, and the panel holds the vault's
            height so the switch doesn't jump the page. Either mode ends in the
            same square, so the switch leaves the destination where it was. */}
        <div className="flex min-h-[27.125rem] flex-col justify-center border-t border-tile-line px-5 py-8 sm:px-6 md:min-h-0 xl:border-l xl:border-t-0">
          <div
            ref={panel}
            className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)_4rem_minmax(0,1fr)]"
          >
            {mode === "vault" ? (
              <>
                {stop(0, flow.step === 0)}
                <Link {...links[0]} vertical className="md:hidden" />
                <Link {...links[0]} className="hidden md:grid" />
                {stop(1, flow.step === 1)}
                <Link {...links[1]} vertical className="md:hidden" />
                <Link {...links[1]} className="hidden md:grid" />
                {stop(2, flow.step === 2)}
              </>
            ) : (
              <>
                {stop(0, !line.paid)}
                {/* The line takes the middle three columns, running out of your
                    wallet's square. Remounted every loop so it resets in place;
                    the rise sits on this wrapper because its fill would pin the
                    fade-out. */}
                <div key={loop} className={cn("mt-2 md:col-span-3 md:mt-0", !reduce && "hs-rise")}>
                  <Timeline beat={line} still={reduce} lost={k("timeline.lost")} />
                </div>
                <Card lit={line.paid} className="mt-2 md:mt-0">
                  <div className="relative flex h-full flex-col gap-2 p-3.5 md:gap-3 md:p-4">
                    <p className="text-[0.9375rem] font-medium leading-snug md:text-base">
                      {k("timeline.wallet")}
                    </p>
                    <ul className="flex gap-4 text-[0.9375rem] md:flex-col md:gap-1">
                      {HELD.map((symbol, n) => (
                        <li
                          key={symbol}
                          className={cn(
                            "transition-colors duration-500",
                            line.paid ? "text-foreground" : "text-muted-foreground/45",
                          )}
                          style={{ transitionDelay: line.paid && !reduce ? `${n * 150}ms` : "0ms" }}
                        >
                          {symbol}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
