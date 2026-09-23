import { useState, type ReactNode } from "react";
import { useTranslation } from "@heirloom/i18n";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { WithWallet, type WalletCtx } from "@/components/WithWallet";
import { AppNav } from "@/components/shell/AppNav";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { AsciiCanvas } from "@/components/landing/AsciiCanvas";
import { markScene } from "@/components/landing/ascii";
import { MarkTile, Ticks } from "@/components/landing/Primitives";
import { Button } from "@/components/ui/button";

export type StocksPageKey =
  "portfolio" | "browse" | "protect" | "dashboard" | "recover" | "inherit";

/**
 * The ruled page every route sits on — the landing's column and quarter
 * rules — with the app's bar above it and the shared footer below. Pages
 * without a key (the 404) bring their own head.
 */
export const PageFrame: React.FC<{
  onConnectWallet: () => void;
  children: ReactNode;
}> = ({ onConnectWallet, children }) => (
  <div className="hs min-h-screen">
    <div className="hs-rules" aria-hidden="true">
      <div />
    </div>
    <div className="hs-body">
      <AppNav onConnectWallet={onConnectWallet} />
      <main className="flex-1 pb-20 md:pb-28">{children}</main>
      <SiteFooter />
    </div>
  </div>
);

/** A page's opening: its name as a tag, the headline, the lede, then a registration rule. */
export const PageHead: React.FC<{
  cap: string;
  headline: string;
  description: string;
  aside?: ReactNode;
}> = ({ cap, headline, description, aside }) => (
  <>
    <header className="hs-col flex flex-col gap-8 pb-10 pt-12 md:flex-row md:items-end md:justify-between md:pb-14 md:pt-20">
      <div className="max-w-[40rem]">
        <span className="hs-tag hs-mono-xs">{cap}</span>
        <h1 className="hs-h2 mt-5">{headline}</h1>
        <p className="hs-lede mt-5 max-w-[34rem] text-foreground/75">{description}</p>
      </div>
      {aside && <div className="md:max-w-[22rem]">{aside}</div>}
    </header>
    <Ticks />
  </>
);

type StocksPageProps =
  | {
      page: StocksPageKey;
      walletOptional?: false;
      aside?: ReactNode;
      children: (wallet: WalletCtx) => ReactNode;
    }
  | {
      page: StocksPageKey;
      /** Render the body without a wallet too, handing it a way to open the connect dialog. */
      walletOptional: true;
      aside?: ReactNode;
      children: (wallet: WalletCtx | null, connect: () => void) => ReactNode;
    };

/**
 * Chrome shared by every app route: the frame, the page's head, and a
 * connect card in place of the body while no wallet is connected. Nearly
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
    <PageFrame onConnectWallet={connect}>
      <PageHead
        cap={t(`pages.${page}.cap`)}
        headline={t(`pages.${page}.headline`)}
        description={t(`pages.${page}.description`)}
        aside={props.aside}
      />
      <div className="hs-col pt-10 md:pt-14">
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
      </div>
      <WalletConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </PageFrame>
  );
};

/**
 * The first thing "Launch app" shows a visitor without a wallet, so it is
 * cut like the landing's intro card: the ask on one side, the mark as a deep
 * ASCII solid behind the app icon on the other.
 */
const ConnectPrompt: React.FC<{ onConnect: () => void }> = ({ onConnect }) => {
  const { t } = useTranslation("stocks");
  const { t: tApp } = useTranslation("app");

  return (
    <div className="hs-card grid gap-6 p-4 md:grid-cols-2 md:p-6">
      <div className="flex flex-col justify-end gap-5 px-2 pb-2 pt-6 md:order-2 md:px-0 md:pb-0">
        <h2 className="hs-h2">{t("connect.title")}</h2>
        <p className="text-[0.975rem] leading-relaxed text-foreground/75">
          {t("connect.description")}
        </p>
        <div className="pt-1">
          <Button variant="primary" onClick={onConnect}>
            {tApp("common.connectWallet")}
          </Button>
        </div>
      </div>
      <div className="relative h-72 overflow-hidden rounded-xl border border-tile-line bg-background md:h-auto md:min-h-[22rem]">
        <AsciiCanvas scene={markScene} fontPx={10} className="text-foreground" />
        <div className="pointer-events-none absolute left-[33%] top-[62%] -translate-x-1/2 -translate-y-1/2">
          <div className="hs-app-tile !w-24 md:!w-28">
            <MarkTile className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
