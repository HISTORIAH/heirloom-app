import { useState, type ReactNode } from "react";
import { useTranslation } from "@heirloom/i18n";
import PageHeader from "@/components/PageHeader";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { WithWallet, type WalletCtx } from "@/components/WithWallet";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";

export type StocksPageKey =
  "portfolio" | "browse" | "protect" | "dashboard" | "recover" | "inherit";

type StocksPageProps =
  | { page: StocksPageKey; walletOptional?: false; children: (wallet: WalletCtx) => ReactNode }
  | {
      page: StocksPageKey;
      /** Render the body without a wallet too, handing it a way to open the connect dialog. */
      walletOptional: true;
      children: (wallet: WalletCtx | null, connect: () => void) => ReactNode;
    };

/**
 * Chrome shared by every route: the header, the page's title block, and a
 * connect prompt in place of the body while no wallet is connected. Nearly
 * everything on this origin is read from and signed by the visitor's own
 * wallet; a page with something to show without one opts out with
 * `walletOptional`.
 */
export const StocksPage: React.FC<StocksPageProps> = (props) => {
  const { page } = props;
  const { t } = useTranslation("stocks");
  const [connectOpen, setConnectOpen] = useState(false);
  const connect = () => setConnectOpen(true);

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <PageHeader onConnectWallet={connect} />
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
            props.walletOptional ? (
              props.children(wallet, connect)
            ) : wallet ? (
              props.children(wallet)
            ) : (
              <ConnectPrompt onConnect={connect} />
            )
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
