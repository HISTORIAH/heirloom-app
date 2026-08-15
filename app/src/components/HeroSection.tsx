import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Play } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useTour } from "@/contexts/TourContext";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import HeroWordmark from "@/components/HeroWordmark";
import { useTranslation } from "@heirloom/i18n";

const HeroSection = () => {
  const { t } = useTranslation("app");
  const { isConnected } = useWallet();
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const [demoOpen, setDemoOpen] = useState(false);

  const handleLaunch = () => {
    track("launch_app_clicked", { connected: isConnected });
    if (isConnected) {
      navigate("/create-vault");
    } else {
      track("tour_started", { source: "hero" });
      startTour();
    }
  };

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      {/* Faint hairline grid — echoes the modular gridlines the page is built on. */}
      <div className="grid-fade-light pointer-events-none absolute inset-0 [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-14 md:py-20">
        {/* The whole hero is one modular grid: black lines, mixed-color cells. */}
        {/* The reveal animates this container, not the cells: the cells' opaque
            fills are the only thing hiding the black scaffold behind them, so
            fading them individually washes the whole hero grey. */}
        <div className="neo-slide-up grid grid-cols-1 gap-1 border-4 border-foreground bg-foreground lg:grid-cols-12">
          {/* Headline cell */}
          <div className="flex flex-col justify-center bg-background p-8 md:p-12 lg:col-span-8 lg:row-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              {t("hero.eyebrow")}
            </span>

            <h1 className="mt-6 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-[5.25rem]">
              {t("hero.headline1")}{" "}
              <span className="bg-accent-pink px-3 text-foreground">{t("hero.headline2")}</span>{" "}
              {t("hero.headline3")}
            </h1>

            <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
              {t("hero.description")}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Button variant="yellow" size="xl" onClick={handleLaunch}>
                {isConnected ? t("hero.createVault") : t("hero.launchTour")}
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="!border-2 !border-foreground/25 bg-transparent text-foreground !shadow-none hover:!translate-x-0 hover:!translate-y-0 hover:!border-foreground/60 hover:bg-foreground/5 hover:!shadow-none active:!translate-x-0 active:!translate-y-0"
                onClick={() => {
                  track("demo_opened", { source: "hero" });
                  setDemoOpen(true);
                }}
              >
                <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                {t("hero.viewDemo")}
              </Button>
            </div>
          </div>

          {/* Yellow attribute cell — the gist, in three flat facts. */}
          <div className="neo-section-yellow flex flex-col justify-center p-8 md:p-10 lg:col-span-4">
            <span className="text-xs font-bold uppercase tracking-[0.25em]">{t("hero.gist")}</span>
            <ul className="mt-4 font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl">
              <li>{t("hero.gist1")}</li>
              <li>{t("hero.gist2")}</li>
              <li>{t("hero.gist3")}</li>
            </ul>
          </div>

          {/* Wordmark cell — the name at poster scale, set in the page's own
              face so it belongs to the type on the left of the grid. */}
          <div className="flex items-center justify-center overflow-hidden bg-background px-4 py-8 md:px-6 lg:col-span-4">
            <HeroWordmark className="whitespace-nowrap font-display text-[clamp(3rem,13vw,4.25rem)] font-bold leading-none tracking-[-0.035em] text-foreground lg:text-[min(5.6vw,4.75rem)]" />
          </div>
        </div>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl gap-0 rounded-none border-4 border-foreground bg-background p-0 shadow-[8px_8px_0px_0px_hsl(var(--foreground))] sm:rounded-none sm:shadow-[12px_12px_0px_0px_hsl(var(--foreground))]">
          <div className="flex items-center justify-between border-b-4 border-foreground bg-accent-yellow px-4 py-3 sm:px-6 sm:py-4">
            <DialogTitle className="text-lg font-bold uppercase tracking-tight sm:text-2xl">
              {t("hero.demoTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("hero.demoDescription")}
            </DialogDescription>
          </div>
          <div className="relative w-full bg-foreground" style={{ aspectRatio: "16 / 9" }}>
            {demoOpen && (
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/zqF4Pnm1G2w?si=NkN81t8zX3ZG1fNT&autoplay=1&rel=0"
                title={t("hero.demoVideoTitle")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
