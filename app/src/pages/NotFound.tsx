import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import GridRules from "@/components/landing/GridRules";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("app");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="app-page">
      <NavBar />
      <div className="relative">
        <GridRules />
        {/* A 404 is still a page of the same book: the number is set as the
            folio would be, oversized, with the apology underneath it. */}
        <div className="relative z-10 flex min-h-[calc(100svh-var(--nav-h))] items-center px-[var(--page-pad)] py-16">
          <div className="rise-in mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <p
              aria-hidden="true"
              className="font-display font-semibold tabular-nums leading-none tracking-[-0.05em] text-foreground/10 lg:col-span-5"
              style={{ fontSize: "clamp(7rem, 18vw, 16rem)" }}
            >
              404
            </p>
            <div className="lg:col-span-7">
              <h1 className="ed-h2">
                {t("notFound.headline1")}{" "}
                <span className="bg-accent-yellow px-2">{t("notFound.headline2")}</span>
              </h1>
              <p className="ed-lede mt-5 max-w-[46ch] text-muted-foreground">
                {t("notFound.description")}
              </p>
              <Button variant="flat" size="lg" className="mt-8" asChild>
                <a href="/">
                  <ArrowLeft className="h-4 w-4" /> {t("notFound.returnHome")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
