import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { Button } from "@/components/ui/button";

/** The app's 404, sending people back to the portfolio rather than a dashboard. */
const NotFound = () => {
  const { t } = useTranslation("app");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-[var(--page-pad)]">
      <div className="max-w-md text-center">
        <p className="ed-label">404</p>
        <h1 className="hero-display mt-3">
          {t("notFound.headline1")} {t("notFound.headline2")}
        </h1>
        <p className="ed-lede mt-4 text-muted-foreground">{t("notFound.description")}</p>
        <Button variant="flat-yellow" size="lg" className="mt-8" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> {t("notFound.returnHome")}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
