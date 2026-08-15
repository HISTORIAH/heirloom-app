import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
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
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="neo-section-yellow mx-auto max-w-7xl border-4 border-foreground px-6 py-16 text-center md:py-24">
        <h2 className="font-display text-4xl leading-[0.92] tracking-tight md:text-6xl lg:text-7xl">
          {t("cta.headline1")}{" "}
          <span className="bg-accent-red px-3 text-background">{t("cta.headline2")}</span>{" "}
          {t("cta.headline3")}
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-xl font-medium leading-relaxed md:text-2xl">
          {t("cta.description")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button variant="default" size="xl" onClick={handleCreate}>
            {t("cta.createVault")}
          </Button>
          <a
            href="https://docs.heirlm.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("docs_link_clicked", { source: "landing_cta" })}
          >
            <Button variant="outline" size="xl">
              {t("cta.readDocs")}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
