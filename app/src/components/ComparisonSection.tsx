import { Check, X, Minus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";

type Attr = true | false | "partial";
type Tone = "dark" | "light" | "highlight";

interface Solution {
  name: string;
  blurb: string;
  attrs: { label: string; value: Attr }[];
  span: string;
  tone: Tone;
}

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
    cell: "border border-white/10 bg-[hsl(0_0%_7%)] text-white hover:border-white/25 hover:bg-[hsl(0_0%_9%)]",
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
    cell: "border border-foreground/15 bg-background text-foreground hover:border-foreground/40 hover:bg-secondary/40",
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
    cell: "neo-section-yellow text-foreground hover:brightness-[0.97]",
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

const solutions: Solution[] = [
  {
    name: "Seed phrase in a safe",
    blurb: "A note in a drawer. No custody logic, nothing on-chain, no plan for silence.",
    attrs: [
      { label: "Self-custodial", value: false },
      { label: "Trustless", value: false },
      { label: "On-chain", value: false },
    ],
    span: "md:col-span-1 lg:col-span-2",
    tone: "dark",
  },
  {
    name: "Casa inheritance",
    blurb: "Assisted inheritance with a custodial layer of trust.",
    attrs: [
      { label: "Self-custodial", value: "partial" },
      { label: "Trustless", value: false },
      { label: "On-chain", value: false },
    ],
    span: "md:col-span-1 lg:col-span-1",
    tone: "light",
  },
  {
    name: "Sarcophagus",
    blurb: "A trustless dead-man's switch — but on Ethereum, not Solana.",
    attrs: [
      { label: "Self-custodial", value: true },
      { label: "Trustless", value: true },
      { label: "On-chain", value: false },
    ],
    span: "md:col-span-1 lg:col-span-1",
    tone: "dark",
  },
  {
    name: "Safe Haven",
    blurb: "Inheritance tooling with partial custody and partial trust.",
    attrs: [
      { label: "Self-custodial", value: "partial" },
      { label: "Trustless", value: "partial" },
      { label: "On-chain", value: false },
    ],
    span: "md:col-span-1 lg:col-span-1",
    tone: "light",
  },
  {
    name: "Heirloom",
    blurb: "Self-custodial, trustless, and fully on-chain on Solana.",
    attrs: [
      { label: "Self-custodial", value: true },
      { label: "Trustless", value: true },
      { label: "On-chain", value: true },
    ],
    span: "md:col-span-2 lg:col-span-3",
    tone: "highlight",
  },
];

const AttrRow = ({
  attrs,
  st,
}: {
  attrs: Solution["attrs"];
  st: (typeof toneStyles)[Tone];
}) => (
  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
    {attrs.map((a) => {
      const icon =
        a.value === true ? (
          <Check className={`h-4 w-4 ${st.yes}`} strokeWidth={3} />
        ) : a.value === "partial" ? (
          <Minus className={`h-4 w-4 ${st.partial}`} strokeWidth={3} />
        ) : (
          <X className={`h-4 w-4 ${st.no}`} strokeWidth={3} />
        );
      return (
        <span
          key={a.label}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${st.attrLabel}`}
        >
          {icon}
          {a.label}
          <span className="sr-only">
            {a.value === true ? "yes" : a.value === "partial" ? "partial" : "no"}
          </span>
        </span>
      );
    })}
  </div>
);

const ComparisonSection = () => {
  const navigate = useNavigate();
  const { track } = useAnalytics();

  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Comparison
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            Nothing else{" "}
            <span className="bg-accent-yellow px-2 text-foreground">comes close.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {solutions.map((s, i) => {
            const st = toneStyles[s.tone];
            const isBest = s.tone === "highlight";
            const Tag = isBest ? "button" : "div";
            return (
              <Tag
                key={s.name}
                {...(isBest
                  ? {
                      onClick: () => {
                        track("launch_app_clicked", { source: "comparison" });
                        navigate("/create-vault");
                      },
                    }
                  : {})}
                className={`group relative flex min-h-[220px] flex-col justify-between p-6 text-left transition-colors duration-200 md:min-h-[260px] ${s.span} ${st.cell}`}
              >
                {/* Corner tick */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-0 top-0 h-3.5 w-3.5 border-l-2 border-t-2 ${st.tick}`}
                />

                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold uppercase tracking-[0.2em] ${st.label}`}>
                    {isBest ? "Best · 05" : `0${i + 1}`}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className={`h-4 w-4 transition-all duration-200 ${st.arrow}`}
                  />
                </div>

                <div>
                  <h3 className="font-display text-3xl leading-none tracking-tight md:text-4xl">
                    {s.name}
                  </h3>
                  <p className={`mt-3 max-w-md text-sm font-medium leading-relaxed ${st.blurb}`}>
                    {s.blurb}
                  </p>
                  <AttrRow attrs={s.attrs} st={st} />
                </div>
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
