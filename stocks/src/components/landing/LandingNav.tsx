import { Link } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import { Brand } from "@/components/shell/Brand";

/**
 * The landing's own bar: the name, three ways into the page, and the one
 * button that leaves for the app. The docs are linked from the footer. It carries no wallet control — the
 * page reads nothing from a wallet, and the app asks for one where it needs it.
 */
export const LandingNav: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <header className="hs-nav">
      <div className="flex h-full items-center justify-between gap-4 px-[var(--page-pad)]">
        <div className="flex items-center gap-6">
          <Brand />
          <nav className="hidden items-center whitespace-nowrap lg:flex">
            <Link to="/browse" className="hs-nav-link">
              {t("landing.nav.stocks")}
            </Link>
            <a href="#how-it-works" className="hs-nav-link">
              {t("landing.nav.howItWorks")}
            </a>
            <a href="#issuers" className="hs-nav-link">
              {t("landing.nav.issuers")}
            </a>
          </nav>
        </div>
        {/* Narrower padding on the smallest phones, where the name and the
            button otherwise need 335px of a 320px screen. */}
        <Link to="/portfolio" className="hs-btn hs-btn-primary hs-btn-sm shrink-0 max-[359px]:px-3.5">
          {t("landing.nav.launch")}
        </Link>
      </div>
    </header>
  );
};
