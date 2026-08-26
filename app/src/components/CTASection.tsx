import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Mosaic, Tile, Cap } from "@/components/surface/Mosaic";
import Section from "@/components/landing/Section";
import HeroWordmark from "@/components/HeroWordmark";
import { useTranslation } from "@heirloom/i18n";

const CTASection = () => {
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");

  const handleCreate = () => {
    track("launch_app_clicked", { source: "landing_cta" });
    navigate("/create-vault");
  };

  return (
    <Section index={10} total={10} label={t("cta.cap")}>
      <Mosaic cols={2} band={2.1}>
        {/* The invitation and the exit, given equal width on purpose: the
            offer is only as good as the way out of it. */}
        <Tile col={1} row={3} colMd={6} tone="ink" className="justify-center">
          <div>
            <h2 className="ed-h2">
              {t("cta.t1")}{" "}
              <span className="whitespace-nowrap bg-accent-yellow px-1.5 text-foreground">{t("cta.t2")}</span>{" "}
              {t("cta.t3")}
            </h2>
            <p className="ed-lede mt-6 max-w-[46ch] text-background/60">{t("cta.lede")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="flat-yellow" size="lg" onClick={handleCreate}>
                {t("cta.createVault")}
              </Button>
              <a
                href="https://docs.heirlm.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("docs_link_clicked", { source: "landing_cta" })}
              >
                <Button
                  variant="flat-outline"
                  size="lg"
                  className="!border-background/40 text-background hover:!bg-background hover:!text-foreground"
                >
                  {t("cta.readDocs")}
                </Button>
              </a>
            </div>
          </div>
        </Tile>

        <Tile col={1} row={3} colMd={6} tone="sage" className="justify-center">
          <Cap tone="sage">{t("cta.exitCap")}</Cap>
          <p className="tile-h mt-6 max-w-[24ch]">{t("cta.exit")}</p>
        </Tile>

        {/* Sign-off: the name set to the full width of the page, gutter to
            gutter, sitting directly on the ruling with no box around it. */}
        <Tile col={2} row={2} colMd={6} tone="plain" bare className="items-center justify-center">
          <HeroWordmark className="block w-full whitespace-nowrap text-center font-display text-[clamp(3rem,18.4vw,23rem)] font-bold leading-[0.82] tracking-[-0.045em] text-foreground" />
        </Tile>
      </Mosaic>
    </Section>
  );
};

export default CTASection;
