import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { MarkTile } from "./Primitives";
import { STOCKS_DOCS_URL } from "./links";

/**
 * The landing's own bar: the name, three ways into the page or the docs, and
 * the one button that leaves for the app. It carries no wallet control — the
 * page reads nothing from a wallet, and the app asks for one where it needs it.
 */
export const LandingNav: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <header className="lp-nav">
      <div className="flex h-full items-center justify-between gap-4 px-[var(--page-pad)]">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            aria-label={t("landing.nav.home")}
            className="flex items-center gap-2.5 rounded-lg"
          >
            <MarkTile className="h-7 w-7" />
            <span className="whitespace-nowrap text-[1.0625rem] font-semibold tracking-[-0.02em]">
              Heirloom <span className="font-normal text-muted-foreground">Stocks</span>
            </span>
          </Link>
          <nav className="hidden items-center whitespace-nowrap lg:flex">
            <Link to="/browse" className="lp-nav-link">
              {t("landing.nav.stocks")}
            </Link>
            <a href="#how-it-works" className="lp-nav-link">
              {t("landing.nav.howItWorks")}
            </a>
            <a href="#issuers" className="lp-nav-link">
              {t("landing.nav.issuers")}
            </a>
            <a href={STOCKS_DOCS_URL} className="lp-nav-link gap-1">
              {t("landing.nav.docs")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </nav>
        </div>
        <Link to="/portfolio" className="lp-btn lp-btn-primary lp-btn-sm">
          {t("landing.nav.launch")}
        </Link>
      </div>
    </header>
  );
};
