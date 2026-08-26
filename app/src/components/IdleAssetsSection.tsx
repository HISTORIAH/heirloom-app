import { ArrowRight } from "lucide-react";
import { Mosaic, Tile, Cap } from "@/components/surface/Mosaic";
import Section, { SectionLead } from "@/components/landing/Section";
import { useTranslation } from "@heirloom/i18n";

// Half the band is the statement, half is the cost and the way out. Two equal
// columns rather than 7/5 — the ink block earns its weight from the colour,
// not from being wider than the tiles beside it.
const IdleAssetsSection = () => {
  const { t } = useTranslation("app");

  return (
    <Section index={2} total={10} label={t("idle.eyebrow")}>
      <SectionLead
        headline={
          <>
            {t("idle.headline1")}{" "}
            <span className="bg-accent-orange px-1.5">{t("idle.headline2")}</span>{" "}
            {t("idle.headline3")}
          </>
        }
        lede={t("idle.lede")}
      />

      <Mosaic cols={2} band={2.8}>
        {/* The three costs, set as display type on ink — the section's one
            loud block, and the only place this copy could carry a screen. */}
        <Tile col={1} row={2} colMd={6} tone="ink" className="justify-center">
          <Cap tone="ink" className="!text-accent-yellow">
            {t("idle.pointsCap")}
          </Cap>
          <ul className="tile-h mt-10 max-w-[20ch] space-y-2">
            <li>{t("idle.point1")}</li>
            <li>{t("idle.point2")}</li>
            <li>{t("idle.point3")}</li>
          </ul>
        </Tile>

        <Tile col={1} row={1} colMd={6} tone="soft" className="justify-center">
          <p className="ed-h3 max-w-[30ch] font-normal text-foreground/80">{t("idle.turn")}</p>
        </Tile>

        <Tile col={1} row={1} colMd={6} tone="paper" className="justify-center">
          <a
            href="#how-it-works"
            className="group inline-flex flex-wrap items-center gap-x-3 gap-y-1 tile-h"
          >
            {t("idle.turnLink1")}{" "}
            <span className="bg-accent-yellow px-1.5">{t("idle.turnLink2")}</span>{" "}
            {t("idle.turnLink3")}
            <ArrowRight
              className="h-7 w-7 shrink-0 transition-transform group-hover:translate-x-1.5 md:h-8 md:w-8"
              strokeWidth={1.75}
            />
          </a>
        </Tile>
      </Mosaic>
    </Section>
  );
};

export default IdleAssetsSection;
