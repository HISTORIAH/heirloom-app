import { Shield, Clock, Zap, Lock, FileCode, Blocks } from "lucide-react";
import { Mosaic, Tile, Cap } from "@/components/landing/Mosaic";
import Section, { SectionLead } from "@/components/landing/Section";
import { toneMuted, type TileTone } from "@/components/landing/tones";
import { useTranslation } from "@heirloom/i18n";

// Six reasons on an even three-by-two block. One cyan tile is the section's
// single accent — a deliberate echo of the yield section.
const WhySolanaSection = () => {
  const { t } = useTranslation("app");

  const reasons: { icon: typeof Zap; title: string; desc: string; tag: string; tone: TileTone }[] = [
    { icon: Zap, title: t("whySolana.n1Title"), desc: t("whySolana.n1Desc"), tag: t("whySolana.n1Tag"), tone: "paper" },
    { icon: Lock, title: t("whySolana.n2Title"), desc: t("whySolana.n2Desc"), tag: t("whySolana.n2Tag"), tone: "soft" },
    { icon: Clock, title: t("whySolana.n3Title"), desc: t("whySolana.n3Desc"), tag: t("whySolana.n3Tag"), tone: "paper" },
    { icon: Shield, title: t("whySolana.n4Title"), desc: t("whySolana.n4Desc"), tag: t("whySolana.n4Tag"), tone: "ink" },
    { icon: Blocks, title: t("whySolana.n5Title"), desc: t("whySolana.n5Desc"), tag: t("whySolana.n5Tag"), tone: "cyan" },
    { icon: FileCode, title: t("whySolana.n6Title"), desc: t("whySolana.n6Desc"), tag: t("whySolana.n6Tag"), tone: "paper" },
  ];

  return (
    <Section id="why-solana" index={7} total={10} label={t("whySolana.eyebrow")}>
      <SectionLead headline={t("whySolana.title")} lede={t("whySolana.lede")} />

      <Mosaic cols={3} band={2.95}>
        {reasons.map((r) => (
          <Tile key={r.title} col={1} row={1} colMd={3} tone={r.tone} className="gap-6 md:gap-8">
            <div className="flex items-start justify-between gap-4">
              <r.icon className="h-7 w-7 shrink-0 md:h-9 md:w-9" strokeWidth={1.75} />
              <Cap tone={r.tone}>{r.tag}</Cap>
            </div>
            <div>
              <h3 className="ed-h3">{r.title}</h3>
              <p className={`tile-body mt-3 max-w-[38ch] ${toneMuted[r.tone]}`}>{r.desc}</p>
            </div>
          </Tile>
        ))}
      </Mosaic>
    </Section>
  );
};

export default WhySolanaSection;
