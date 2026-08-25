import type { ReactNode } from "react";
import PageHeader from "@/components/PageHeader";

interface PortalLayoutProps {
  title: string;
  cap: string;
  headline: ReactNode;
  description: string;
  onConnectWallet: () => void;
  children: ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  title,
  cap,
  headline,
  description,
  onConnectWallet,
  children,
}) => (
  <div className="min-h-screen overflow-x-clip bg-background">
    <PageHeader title={title} onConnectWallet={onConnectWallet} />
    <main className="mx-auto max-w-2xl px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)]">
      <header className="mb-8">
        <span className="ed-label">{cap}</span>
        <h1 className="ed-h2 mt-2">{headline}</h1>
        <p className="ed-lede mt-3 max-w-[46ch] text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-5">{children}</div>
    </main>
  </div>
);
