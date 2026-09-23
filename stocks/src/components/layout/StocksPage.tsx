import { useState, type ReactNode } from "react";
import { useTranslation } from "@heirloom/i18n";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { WithWallet, type WalletCtx } from "@/components/WithWallet";
import { PageSessionContext, usePageSession, type PageSession } from "@/contexts/PageSession";
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

/**
 * Chrome shared by every app route: the frame, the page's head, and the page
 * session. No route is gated on a wallet — every page renders without one, so
 * a visitor can see what each part of the app does before trusting it with a
 * key. The body gets the wallet when there is one, and asks for it through
 * `requireWallet` (see contexts/PageSession) only when an action needs a
 * signature.
 */
export const StocksPage: React.FC<{
  page: StocksPageKey;
  aside?: ReactNode;
  children: (wallet: WalletCtx | null) => ReactNode;
}> = ({ page, aside, children }) => {
  const { t } = useTranslation("stocks");
  const [connectOpen, setConnectOpen] = useState(false);
  // Held for the page's lifetime, above the body that remounts on connect.
  const [session] = useState<PageSession>(() => {
    const intents = new Map<string, unknown>();
    return {
      connect: () => setConnectOpen(true),
      requireWallet: (key, payload) => {
        intents.set(key, payload ?? true);
        setConnectOpen(true);
      },
      drafts: new Map(),
      intents,
    };
  });

  return (
    <PageSessionContext.Provider value={session}>
      <PageFrame onConnectWallet={session.connect}>
        <PageHead
          cap={t(`pages.${page}.cap`)}
          headline={t(`pages.${page}.headline`)}
          description={t(`pages.${page}.description`)}
          aside={aside}
        />
        <div className="hs-col pt-10 md:pt-14">
          <WithWallet>{(wallet) => children(wallet)}</WithWallet>
        </div>
        <WalletConnectDialog
          open={connectOpen}
          onOpenChange={setConnectOpen}
          // An action that asked for a wallet and didn't get one is dropped, so
          // connecting later from the bar can't start it unasked.
          onDismiss={() => session.intents.clear()}
        />
      </PageFrame>
    </PageSessionContext.Provider>
  );
};

/**
 * A page's invitation to connect, cut like the landing's intro card: the ask
 * on one side, the mark as a deep ASCII solid behind the app icon on the
 * other. Used where a page has nothing to show until it knows the wallet.
 */
export const ConnectCard: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => {
  const { t: tApp } = useTranslation("app");
  const { connect } = usePageSession();

  return (
    <div className="hs-card grid gap-6 p-4 md:grid-cols-2 md:p-6">
      <div className="flex flex-col justify-end gap-5 px-2 pb-2 pt-6 md:order-2 md:px-0 md:pb-0">
        <h2 className="hs-h2">{title}</h2>
        <p className="text-[0.975rem] leading-relaxed text-foreground/75">{description}</p>
        <div className="pt-1">
          <Button variant="primary" onClick={connect}>
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
