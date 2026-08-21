import { useState } from "react";
import { cn } from "@/lib/utils";
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
import OrbitingVault from "@/components/landing/OrbitingVault";
import { Cap } from "@/components/landing/Mosaic";
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

  const rail = [
    { label: t("hero.rail1Label"), value: t("hero.rail1Value") },
    { label: t("hero.rail2Label"), value: t("hero.rail2Value") },
    { label: t("hero.rail3Label"), value: t("hero.rail3Value") },
    { label: t("hero.rail4Label"), value: t("hero.rail4Value") },
  ];

  return (
    <section className="section-full text-foreground">
      {/* The opening spread. Copy holds the left seven columns, the object the
          right five, and the whole thing runs gutter to gutter — the headline
          is set to the window, not to a measure. */}
      <div className="section-body">
        <div className="section-inner grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7 lg:pr-[6%]">
            <div className="flex items-center gap-4">
              <Cap tone="plain">{t("hero.kicker")}</Cap>
              <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
            </div>
            <h1 className="hero-display mt-7">
              {t("hero.line1")}
              <br />
              {t("hero.line2")}
              <br />
              {t("hero.line3")}
            </h1>
            <p className="ed-lede mt-8 max-w-[42ch] text-muted-foreground">
              {t("hero.lede")}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button variant="flat" size="lg" onClick={handleLaunch}>
                {isConnected ? t("hero.createVault") : t("hero.launchTour")}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="gap-2 text-base font-bold hover:bg-transparent hover:underline"
                onClick={() => {
                  track("demo_opened", { source: "hero" });
                  setDemoOpen(true);
                }}
              >
                <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                {t("hero.viewDemo")}
              </Button>
            </div>
          </div>

          {/* The orbit throws discs a little outside its own box, so the
              object is sized to 82% of its column — the ring stays clear of
              the right rule instead of crossing it. */}
          <div className="flex justify-center lg:col-span-5">
            <OrbitingVault className="w-[86%] max-w-[26rem] sm:max-w-[32rem] lg:w-[95%] lg:max-w-none" />
          </div>
        </div>
      </div>

      {/* Facts worth reading before scrolling, set as a masthead strip: the
          rule runs the full width of the window, the type stays in the
          gutters, and a column rule stands between each fact. */}
      <div className="w-full border-t border-tile-line bg-background">
        <dl className="section-inner grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {rail.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "py-7 md:py-9",
                // Column rules between facts, following the grid as it folds:
                // four across, then two, then one.
                i > 0 && "border-t border-tile-line pt-6",
                i % 2 === 1 && "sm:border-t-0 sm:border-l sm:pl-6 sm:pt-6",
                i >= 2 && "sm:border-t sm:pt-6",
                i > 0 && "lg:border-l lg:border-t-0 lg:pl-6 lg:pt-7",
              )}
            >
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground md:text-xs">
                {item.label}
              </dt>
              <dd className="ed-h3 mt-3 max-w-[22ch]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl gap-0 rounded-xl border border-tile-line bg-background p-0">
          <div className="flex items-center justify-between rounded-t-xl border-b border-tile-line bg-accent-yellow px-5 py-3.5">
            <DialogTitle className="text-base font-bold uppercase tracking-tight sm:text-lg">
              {t("hero.demoTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("hero.demoDescription")}</DialogDescription>
          </div>
          <div className="relative w-full overflow-hidden rounded-b-xl bg-foreground" style={{ aspectRatio: "16 / 9" }}>
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
