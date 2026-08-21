import { TrendingUp, KeyRound, Users } from "lucide-react";
import { Mosaic, Tile } from "@/components/landing/Mosaic";
import Section, { SectionLead } from "@/components/landing/Section";
import { toneMuted, toneCap, type TileTone } from "@/components/landing/tones";
import { useTranslation } from "@heirloom/i18n";

// Three jobs, three equal columns. The tiles were uneven before and the page
// read as drifting; at full bleed the symmetry is what makes the band land.
const UseCasesSection = () => {
  const { t } = useTranslation("app");

  const cases: { icon: typeof TrendingUp; tag: string; title: string; desc: string; tone: TileTone }[] = [
    { icon: TrendingUp, tag: t("useCases.c1Tag"), title: t("useCases.c1Title"), desc: t("useCases.c1Desc"), tone: "yellow" },
    { icon: KeyRound, tag: t("useCases.c2Tag"), title: t("useCases.c2Title"), desc: t("useCases.c2Desc"), tone: "sky" },
    { icon: Users, tag: t("useCases.c3Tag"), title: t("useCases.c3Title"), desc: t("useCases.c3Desc"), tone: "sage" },
  ];

  return (
    <Section index={1} total={10} label={t("useCases.eyebrow")}>
      <SectionLead
        headline={
          <>
            {t("useCases.headline1")}{" "}
            <span className="bg-accent-yellow px-1.5">{t("useCases.headline2")}</span>
          </>
        }
        lede={t("useCases.lede")}
      />

      <Mosaic cols={3} band={3.1}>
        {cases.map((c) => (
          <Tile key={c.title} col={1} row={1} colMd={3} tone={c.tone} className="gap-8">
            {/* Copy sits at the top of the field and the mark anchors the
                bottom-right corner — the tile is read, then recognised. */}
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-[0.18em] md:text-xs ${toneCap[c.tone]}`}>
                {c.tag}
              </span>
              <h3 className="tile-h mt-4 min-h-[2em]">{c.title}</h3>
              <p className={`tile-body mt-5 max-w-[34ch] ${toneMuted[c.tone]}`}>{c.desc}</p>
            </div>
            <c.icon
              aria-hidden="true"
              className="mark-lg self-end"
              strokeWidth={1.5}
            />
          </Tile>
        ))}
      </Mosaic>
    </Section>
  );
};

export default UseCasesSection;
