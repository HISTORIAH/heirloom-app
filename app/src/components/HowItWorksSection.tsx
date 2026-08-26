import { Wallet, Coins, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { Mosaic, Tile } from "@/components/surface/Mosaic";
import Section, { SectionLead } from "@/components/landing/Section";
import { toneMuted, toneCap, type TileTone } from "@/components/surface/tones";
import { useTranslation } from "@heirloom/i18n";

// Four steps as a two-by-two block. Four across made columns too narrow for
// the type; two across gives each step a landscape field it can fill.
const HowItWorksSection = () => {
  const { t } = useTranslation("app");

  const steps: { icon: typeof Wallet; title: string; desc: string; tone: TileTone }[] = [
    { icon: Wallet, title: t("howItWorks.s1Title"), desc: t("howItWorks.s1Desc"), tone: "yellow" },
    { icon: Coins, title: t("howItWorks.s2Title"), desc: t("howItWorks.s2Desc"), tone: "paper" },
    { icon: CheckCircle2, title: t("howItWorks.s3Title"), desc: t("howItWorks.s3Desc"), tone: "soft" },
    { icon: ArrowRightLeft, title: t("howItWorks.s4Title"), desc: t("howItWorks.s4Desc"), tone: "paper" },
  ];

  return (
    <Section id="how-it-works" index={3} total={10} label={t("howItWorks.eyebrow")}>
      <SectionLead
        headline={
          <>
            {t("howItWorks.title1")}
            <br />
            <span className="bg-accent-purple px-1.5 text-background">
              {t("howItWorks.title2")}
            </span>
          </>
        }
        lede={t("howItWorks.lede")}
      />

      <Mosaic cols={2} band={3}>
        {steps.map((s, i) => (
          <Tile key={s.title} col={1} row={1} colMd={3} tone={s.tone} className="gap-6 md:gap-8">
            <div className="flex items-start justify-between gap-4">
              <span className={`tile-num ${toneCap[s.tone]}`}>{`0${i + 1}`}</span>
              <s.icon className="h-7 w-7 shrink-0 md:h-9 md:w-9" strokeWidth={1.75} />
            </div>
            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
              <h3 className="tile-h md:max-w-[9ch] md:flex-1">{s.title}</h3>
              <p className={`tile-body max-w-[40ch] md:flex-1 ${toneMuted[s.tone]}`}>{s.desc}</p>
            </div>
          </Tile>
        ))}
      </Mosaic>
    </Section>
  );
};

export default HowItWorksSection;
