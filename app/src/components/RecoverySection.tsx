import { Wallet, Unplug, LifeBuoy, ShieldCheck } from "lucide-react";
import { Mosaic, Tile } from "@/components/surface/Mosaic";
import Section, { SectionLead, SectionNote } from "@/components/landing/Section";
import { toneMuted, toneCap, type TileTone } from "@/components/surface/tones";
import { useTranslation } from "@heirloom/i18n";

// Three equal beats — today, the bad day, the way back — with the bad day in
// ink between two lighter tiles so the middle of the band is the low point
// and the row reads as a passage rather than an ending.
const RecoverySection = () => {
  const { t } = useTranslation("app");

  const beats: { icon: typeof Wallet; label: string; desc: string; tone: TileTone }[] = [
    { icon: Wallet, label: t("recovery.s1Label"), desc: t("recovery.s1Desc"), tone: "sky" },
    { icon: Unplug, label: t("recovery.s2Label"), desc: t("recovery.s2Desc"), tone: "ink" },
    { icon: LifeBuoy, label: t("recovery.s3Label"), desc: t("recovery.s3Desc"), tone: "yellow" },
  ];

  return (
    <Section id="recovery" index={5} total={10} label={t("recovery.eyebrow")}>
      <SectionLead
        headline={
          <>
            {t("recovery.title1")}{" "}
            <span className="bg-accent-pink px-1.5">{t("recovery.title2")}</span>
          </>
        }
        lede={t("recovery.lede")}
      />

      <Mosaic cols={3} band={3.5}>
        {beats.map((b, i) => (
          <Tile key={b.label} col={1} row={1} colMd={3} tone={b.tone} className="gap-6 md:gap-8">
            <div className="flex items-start justify-between gap-4">
              <span className={`tile-num ${toneCap[b.tone]}`}>{`0${i + 1}`}</span>
              <b.icon className="h-7 w-7 shrink-0 md:h-9 md:w-9" strokeWidth={1.75} />
            </div>
            <h3 className="tile-h">{b.label}</h3>
            <p className={`tile-body max-w-[34ch] ${toneMuted[b.tone]}`}>{b.desc}</p>
          </Tile>
        ))}
      </Mosaic>

      {/* The human failsafe on top of the timer — a footnote, not a tile. */}
      <SectionNote icon={ShieldCheck} label={t("recovery.guardianTitle")} className="!bg-accent-sage !border-accent-sage">
        {t("recovery.guardianDesc")}
      </SectionNote>
    </Section>
  );
};

export default RecoverySection;
