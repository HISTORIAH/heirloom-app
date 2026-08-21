import { Check, X, Minus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Mosaic, Tile } from "@/components/landing/Mosaic";
import Section, { SectionLead } from "@/components/landing/Section";
import { useTranslation } from "@heirloom/i18n";

type Attr = true | false | "partial";
type Tone = "dark" | "light" | "highlight";

// This section keeps its own tone system rather than the page's tile fills:
// alternating dark and light cells with a corner tick is what makes a
// comparison scan like a comparison. Spans stay uneven so it still belongs to
// the mosaic — the two cells that matter most are the widest.
const toneStyles: Record<
  Tone,
  {
    cell: string;
    label: string;
    blurb: string;
    arrow: string;
    tick: string;
    attrLabel: string;
    yes: string;
    partial: string;
    no: string;
  }
> = {
  dark: {
    cell: "!border-white/10 !bg-[hsl(0_0%_7%)] !text-white hover:!border-white/25 hover:!bg-[hsl(0_0%_9%)]",
    label: "text-white/40",
    blurb: "text-white/45",
    arrow: "text-white/20 group-hover:text-white/50",
    tick: "border-white/30",
    attrLabel: "text-white/50",
    yes: "text-accent-lime",
    partial: "text-accent-yellow",
    no: "text-white/25",
  },
  light: {
    cell: "!border-foreground/15 !bg-background !text-foreground hover:!border-foreground/40 hover:!bg-tile-soft",
    label: "text-muted-foreground",
    blurb: "text-muted-foreground",
    arrow: "text-foreground/25 group-hover:text-foreground/60",
    tick: "border-foreground/30",
    attrLabel: "text-muted-foreground",
    yes: "text-foreground",
    partial: "text-muted-foreground",
    no: "text-muted-foreground/40",
  },
  highlight: {
    cell: "!border-accent-yellow !bg-accent-yellow !text-foreground hover:!brightness-[0.97]",
    label: "text-foreground/60",
    blurb: "text-foreground/70",
    arrow: "text-foreground group-hover:translate-x-1",
    tick: "border-foreground/40",
    attrLabel: "text-foreground/70",
    yes: "text-foreground",
    partial: "text-foreground/60",
    no: "text-foreground/40",
  },
};

const AttrRow = ({
  attrs,
  labels,
  st,
  t,
}: {
  attrs: Attr[];
  labels: string[];
  st: (typeof toneStyles)[Tone];
  t: (key: string) => string;
}) => (
  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
    {attrs.map((value, i) => (
      <span
        key={labels[i]}
        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${st.attrLabel}`}
      >
        {value === true ? (
          <Check className={`h-4 w-4 shrink-0 ${st.yes}`} strokeWidth={3} />
        ) : value === "partial" ? (
          <Minus className={`h-4 w-4 shrink-0 ${st.partial}`} strokeWidth={3} />
        ) : (
          <X className={`h-4 w-4 shrink-0 ${st.no}`} strokeWidth={3} />
        )}
        {labels[i]}
        <span className="sr-only">
          {value === true
            ? t("comparison.yes")
            : value === "partial"
              ? t("comparison.partial")
              : t("comparison.no")}
        </span>
      </span>
    ))}
  </div>
);

const ComparisonSection = () => {
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");

  const labels = [
    t("comparison.attrSelfCustodial"),
    t("comparison.attrTrustless"),
    t("comparison.attrOnChain"),
    t("comparison.attrEarns"),
  ];

  const solutions: {
    name: string;
    blurb: string;
    attrs: Attr[];
    tone: Tone;
    col: number;
    best?: boolean;
  }[] = [
    { name: t("comparison.s1Name"), blurb: t("comparison.b1"), attrs: [false, false, false, false], tone: "dark", col: 2 },
    { name: t("comparison.s2Name"), blurb: t("comparison.b2"), attrs: ["partial", false, false, false], tone: "light", col: 2 },
    { name: t("comparison.s3Name"), blurb: t("comparison.b3"), attrs: [true, true, false, false], tone: "dark", col: 2 },
    { name: t("comparison.s4Name"), blurb: t("comparison.b4"), attrs: ["partial", "partial", false, false], tone: "light", col: 3 },
    { name: t("comparison.s5Name"), blurb: t("comparison.b5"), attrs: [true, true, true, true], tone: "highlight", col: 3, best: true },
  ];

  return (
    <Section id="compare" index={8} total={10} label={t("comparison.eyebrow")}>
      <SectionLead
        headline={
          <>
            {t("comparison.headline1")}{" "}
            <span className="bg-accent-yellow px-1.5">{t("comparison.headline2")}</span>
          </>
        }
      />

      <Mosaic cols={6} band={2.6}>
        {solutions.map((s, i) => {
          const st = toneStyles[s.tone];
          const Inner = (
            <>
              {/* Corner tick — the detail that made this grid read as a spec sheet. */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 ${st.tick}`}
              />
              <div className="flex items-start justify-between">
                <span className={`text-xs font-bold uppercase tracking-[0.2em] ${st.label}`}>
                  {s.best ? t("comparison.best") : `0${i + 1}`}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 transition-all duration-200 ${st.arrow}`}
                />
              </div>
              <div className="mt-10">
                <h3 className="font-display text-3xl font-semibold leading-none tracking-tight md:text-4xl">
                  {s.name}
                </h3>
                <p className={`mt-3 max-w-md text-sm font-medium leading-relaxed ${st.blurb}`}>
                  {s.blurb}
                </p>
                <AttrRow attrs={s.attrs} labels={labels} st={st} t={t} />
              </div>
            </>
          );

          return (
            <Tile
              key={s.name}
              col={s.col}
              row={1}
              colMd={3}
              tone="paper"
              bare
              className={`group relative transition-colors duration-200 ${st.cell}`}
            >
              {s.best ? (
                <button
                  onClick={() => {
                    track("launch_app_clicked", { source: "comparison" });
                    navigate("/create-vault");
                  }}
                  className="flex h-full w-full flex-col justify-between p-6 text-left md:p-7 xl:p-8 2xl:p-10"
                >
                  {Inner}
                </button>
              ) : (
                <div className="flex h-full w-full flex-col justify-between p-6 md:p-7 xl:p-8 2xl:p-10">{Inner}</div>
              )}
            </Tile>
          );
        })}
      </Mosaic>
    </Section>
  );
};

export default ComparisonSection;
