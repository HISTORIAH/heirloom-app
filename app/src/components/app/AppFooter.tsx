import { HEIRLOOM_PROGRAM_ADDRESS } from "@historiah/heirloom";
import { LanguageSwitcher, useTranslation } from "@heirloom/i18n";
import { DOCS_URL, PRIVACY_URL, TERMS_URL } from "@/config";
import { X_URL } from "@/lib/constants";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn, getSolanaExplorerAddressUrl, SOLANA_CHAIN, truncateAddress } from "@/lib/utils";

/** Badge colours per cluster: yellow says "not real money", lime says live. */
const NETWORK_BADGE: Record<string, { labelKey: string; fill: string; dot: string }> = {
  "solana:mainnet": {
    labelKey: "footer.mainnet",
    fill: "bg-accent-lime/25",
    dot: "bg-accent-lime",
  },
  "solana:devnet": {
    labelKey: "footer.devnet",
    fill: "bg-accent-yellow/25",
    dot: "bg-accent-yellow",
  },
  "solana:testnet": {
    labelKey: "footer.testnet",
    fill: "bg-accent-yellow/25",
    dot: "bg-accent-yellow",
  },
  "solana:localnet": {
    labelKey: "footer.localnet",
    fill: "bg-tile-soft",
    dot: "bg-muted-foreground",
  },
};

/** Read once at load; the year rolling over mid-session can wait for a refresh. */
const COPYRIGHT_YEAR = new Date().getFullYear();

const footerLink =
  "flex min-h-11 items-center font-medium text-muted-foreground transition-colors hover:text-foreground";

const XLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
  </svg>
);

/** One thin row under every app page: which network this is, the program, and the links. */
export const AppFooter: React.FC = () => {
  const { t } = useTranslation("app");
  const badge = NETWORK_BADGE[SOLANA_CHAIN] ?? NETWORK_BADGE["solana:mainnet"];

  return (
    <footer className="border-t border-tile-line bg-background">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-[var(--page-pad)] py-2 text-[13px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span
            className={cn(
              "flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground",
              badge.fill,
            )}
          >
            <span aria-hidden="true" className={cn("h-[7px] w-[7px] rounded-full", badge.dot)} />
            {t(badge.labelKey)}
          </span>
          <a
            href={getSolanaExplorerAddressUrl(HEIRLOOM_PROGRAM_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
            title={HEIRLOOM_PROGRAM_ADDRESS}
            className={cn(footerLink, "font-mono text-xs underline underline-offset-4")}
          >
            {t("footer.program", { id: truncateAddress(HEIRLOOM_PROGRAM_ADDRESS, 4) })}
          </a>
          <span>{t("footer.rights", { year: COPYRIGHT_YEAR })}</span>
        </div>

        <nav aria-label={t("footer.label")} className="flex flex-wrap items-center gap-x-5">
          {/* The docs and legal pages are on the landing's origin, so these are anchors. */}
          <a
            href={DOCS_URL}
            onClick={() => trackAnalyticsEvent("docs_link_clicked")}
            className={footerLink}
          >
            {t("nav.docs")}
          </a>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("footer.xLabel")}
            title={t("footer.xLabel")}
            className={cn(footerLink, "min-w-11 justify-center")}
          >
            <XLogo />
          </a>
          <a href={TERMS_URL} className={footerLink}>
            {t("footer.terms")}
          </a>
          <a href={PRIVACY_URL} className={footerLink}>
            {t("footer.privacy")}
          </a>
          {/* Opens upward: the footer is the last thing on the page. */}
          <LanguageSwitcher
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-tile-line px-2.5 text-xs font-bold uppercase text-muted-foreground transition-colors hover:bg-tile-soft hover:text-foreground"
            menuClassName="absolute bottom-full right-0 z-50 mb-2 w-44 space-y-1 rounded-xl border border-tile-line bg-background p-2 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.25)]"
            itemClassName="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-tile-soft hover:text-foreground"
            activeItemClassName="!text-foreground bg-tile-soft"
            globeClassName="h-3.5 w-3.5"
            chevronClassName="h-3 w-3 opacity-60"
          />
        </nav>
      </div>
    </footer>
  );
};
