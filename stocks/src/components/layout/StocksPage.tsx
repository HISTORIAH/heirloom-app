import { useState, type ReactNode } from "react";
import { useTranslation } from "@heirloom/i18n";
import PageHeader from "@/components/PageHeader";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { WithWallet, type WalletCtx } from "@/components/WithWallet";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";

export type StocksPageKey = "portfolio" | "protect" | "dashboard" | "recover" | "inherit";

/**
 * Chrome shared by every route: the header, the page's title block, and a
 * connect prompt in place of the body while no wallet is connected. Everything
 * on this origin is read from and signed by the visitor's own wallet, so no
 * page has anything to show without one.
 */
export const StocksPage: React.FC<{
  page: StocksPageKey;
  children: (wallet: WalletCtx) => ReactNode;
}> = ({ page, children }) => {
  const { t } = useTranslation("stocks");
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <PageHeader onConnectWallet={() => setConnectOpen(true)} />
      <main className="app-shell px-[var(--page-pad)] py-[clamp(1.5rem,6vh,5rem)]">
        <header className="mb-8 max-w-3xl">
          <span className="ed-label">{t(`pages.${page}.cap`)}</span>
          <h1 className="ed-h2 mt-2">{t(`pages.${page}.headline`)}</h1>
          <p className="ed-lede mt-3 max-w-[52ch] text-muted-foreground">
            {t(`pages.${page}.description`)}
          </p>
        </header>
        <WithWallet>
          {(wallet) =>
            wallet ? children(wallet) : <ConnectPrompt onConnect={() => setConnectOpen(true)} />
          }
        </WithWallet>
      </main>
      <WalletConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
};

const ConnectPrompt: React.FC<{ onConnect: () => void }> = ({ onConnect }) => {
  const { t } = useTranslation("stocks");
  const { t: tApp } = useTranslation("app");

  return (
    <Panel tone="soft" className="max-w-xl gap-3">
      <h2 className="ed-h3">{t("connect.title")}</h2>
      <p className="ed-body text-muted-foreground">{t("connect.description")}</p>
      <Button variant="flat-yellow" className="mt-2 self-start" onClick={onConnect}>
        {tApp("common.connectWallet")}
      </Button>
    </Panel>
  );
};
