import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import PageHeader from "@/components/PageHeader";
import VaultMark from "@/components/VaultMark";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { Button } from "@/components/ui/button";
import { DOCS_URL, landingUrl } from "@/config";
import { trackAnalyticsEvent } from "@/lib/analytics";

const helpLink =
  "border-b border-tile-line pb-0.5 font-semibold transition-colors hover:border-foreground";

const NotFound = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation("app");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-x-clip bg-background">
        <PageHeader onConnectWallet={() => setWalletDialogOpen(true)} />
        <main className="app-shell flex flex-1 items-center justify-center px-[var(--page-pad)] py-[clamp(3rem,10vh,8rem)]">
          <div className="seal-rise flex w-full max-w-2xl flex-col items-center text-center">
            {/* The mark stands in for the zero: the vault is still here, only the page is not. */}
            <p
              aria-hidden="true"
              className="flex items-center gap-[0.06em] font-display text-[clamp(7rem,17vw,12rem)] font-semibold leading-none tracking-[-0.06em]"
            >
              <span>4</span>
              <span className="lost-beat flex h-[0.74em] w-[0.74em] items-center justify-center rounded-[0.16em] bg-accent-yellow">
                <VaultMark className="h-[60%] w-[60%]" />
              </span>
              <span>4</span>
            </p>

            <p className="ed-label mt-8">{t("notFound.cap")}</p>
            <h1 className="ed-h2 mt-3">{t("notFound.headline")}</h1>
            <p className="ed-lede mt-4 max-w-md text-muted-foreground">
              {t("notFound.description")}
            </p>

            <p className="mt-5 max-w-full truncate rounded-lg border border-tile-line bg-tile-soft px-3 py-1.5 font-mono text-[0.8125rem] text-muted-foreground">
              <span className="sr-only">{t("notFound.requested")} </span>
              <span className="line-through decoration-accent-red/70">{location.pathname}</span>
            </p>

            {/* Lime is the "alive and well" colour; the one thing a lost visitor should not worry about. */}
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-2xl bg-accent-lime/25 px-4 py-2 text-left text-sm font-semibold sm:rounded-full">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
              {t("notFound.safe")}
            </p>

            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
              {/* The dashboard, not "/": that is only a redirect to it anyway. */}
              <Button variant="flat-yellow" size="lg" className="px-8" asChild>
                <Link to="/estates">
                  <ArrowLeft /> {t("notFound.backToEstates")}
                </Link>
              </Button>
              <Button variant="flat-outline" size="lg" className="px-8" asChild>
                <a href={landingUrl(i18n.resolvedLanguage ?? i18n.language)}>
                  {t("notFound.landingHome")} <ArrowUpRight />
                </a>
              </Button>
            </div>

            <nav
              aria-label={t("notFound.helpLabel")}
              className="mt-12 flex w-full max-w-md flex-col items-center gap-3 border-t border-tile-line pt-6 text-[0.9375rem] sm:flex-row sm:justify-center sm:gap-6"
            >
              <span className="ed-label">{t("notFound.orTry")}</span>
              <Link to="/inherit" className={helpLink}>
                {t("notFound.inherit")}
              </Link>
              <a
                href={DOCS_URL}
                onClick={() => trackAnalyticsEvent("docs_link_clicked")}
                className={helpLink}
              >
                {t("notFound.docs")}
              </a>
            </nav>
          </div>
        </main>
      </div>
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default NotFound;
