import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("app");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-[var(--page-pad)]">
      <div className="max-w-md text-center">
        <p className="ed-label">404</p>
        <h1 className="hero-display mt-3">
          {t("notFound.headline1")} {t("notFound.headline2")}
        </h1>
        <p className="ed-lede mt-4 text-muted-foreground">{t("notFound.description")}</p>
        {/* The dashboard, not "/" — that is a redirect to here anyway, and the
            header's Home control means the marketing site on the other origin. */}
        <Button variant="flat-yellow" size="lg" className="mt-8" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" /> {t("notFound.returnHome")}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
