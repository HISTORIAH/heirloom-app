import { Banknote, Layers, Undo2 } from "lucide-react";
import { Mosaic, Tile, Cap } from "@/components/surface/Mosaic";
import Section, { SectionLead } from "@/components/landing/Section";
import { toneMuted, toneCap, type TileTone } from "@/components/surface/tones";
import { useTranslation } from "@heirloom/i18n";

// The take is stated across the full width before the three strategies —
// saying the fee out loud, at headline scale, is what makes the pitch under
// it credible.
const YieldSection = () => {
  const { t } = useTranslation("app");

  const strategies: { icon: typeof Banknote; title: string; desc: string; tone: TileTone }[] = [
    { icon: Banknote, title: t("yieldSection.c1Title"), desc: t("yieldSection.c1Desc"), tone: "paper" },
    { icon: Layers, title: t("yieldSection.c2Title"), desc: t("yieldSection.c2Desc"), tone: "soft" },
    { icon: Undo2, title: t("yieldSection.c3Title"), desc: t("yieldSection.c3Desc"), tone: "cyan" },
  ];

  return (
    <Section id="yield" index={4} total={10} label={t("yieldSection.eyebrow")}>
      <SectionLead
        headline={
          <>
            {t("yieldSection.title1")}{" "}
            <span className="bg-accent-cyan px-1.5">{t("yieldSection.title2")}</span>
          </>
        }
        lede={t("yieldSection.lede")}
      />

      <Mosaic cols={3} band={2.65}>
        <Tile col={3} row={1} colMd={6} tone="ink" className="justify-center">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-16">
            <div className="md:flex-1">
              <Cap tone="ink">{t("yieldSection.feeTitle")}</Cap>
              <p className="ed-h2 mt-4">{t("yieldSection.feeHeadline")}</p>
            </div>
            <p className="ed-lede max-w-[42ch] text-background/60 md:flex-1">
              {t("yieldSection.feeDesc")}
            </p>
          </div>
        </Tile>

        {strategies.map((s, i) => (
          <Tile key={s.title} col={1} row={1} colMd={3} tone={s.tone} className="gap-6 md:gap-8">
            <div className="flex items-start justify-between gap-4">
              <span className={`tile-num ${toneCap[s.tone]}`}>{`0${i + 1}`}</span>
              <s.icon className="h-7 w-7 shrink-0 md:h-9 md:w-9" strokeWidth={1.75} />
            </div>
            <h3 className="tile-h">{s.title}</h3>
            <p className={`tile-body max-w-[34ch] ${toneMuted[s.tone]}`}>{s.desc}</p>
          </Tile>
        ))}
      </Mosaic>
    </Section>
  );
};

export default YieldSection;
