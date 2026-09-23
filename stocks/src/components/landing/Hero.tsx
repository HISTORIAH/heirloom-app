import { Link } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import { AsciiCanvas } from "./AsciiCanvas";
import { markScene } from "./ascii";
import { MarkTile } from "./Primitives";

/**
 * The opening screen: the line and the two ways in on the left, and on the
 * right the mark twice over — flat, as the app icon, and as a deep ASCII solid
 * trailing out of the grid behind it.
 */
export const Hero: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <section className="hs-col hs-hero flex flex-col md:block">
      <div className="hs-hero-art order-2 text-foreground">
        <AsciiCanvas scene={markScene} className="text-foreground" />
        {/* The tile sits over the solid's front face; see markScene.anchor. */}
        <div className="pointer-events-none absolute left-[33%] top-[62%] -translate-x-1/2 -translate-y-1/2">
          <div className="hs-app-tile">
            <MarkTile className="h-full w-full" />
          </div>
        </div>
      </div>

      <div className="relative order-1 flex flex-col justify-center pb-10 pt-14 md:min-h-[inherit] md:w-[54%] md:py-24">
        <h1 className="hs-display">
          {t("landing.hero.titleA")}
          <br />
          {t("landing.hero.titleB")}
        </h1>
        <p className="hs-lede mt-6 max-w-[30rem] text-foreground/80">{t("landing.hero.lede")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/portfolio" className="hs-btn hs-btn-primary">
            {t("landing.hero.primary")}
          </Link>
          <Link to="/browse" className="hs-btn hs-btn-ghost">
            {t("landing.hero.secondary")}
          </Link>
        </div>
        <p className="hs-mono-xs mt-6 text-muted-foreground">{t("landing.hero.note")}</p>
      </div>
    </section>
  );
};
