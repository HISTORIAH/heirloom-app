import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/surface/Panel";

/**
 * The states every role page passes through before it has estates to show: no wallet, the
 * scan running, the scan failing, and nothing found.
 */

export const ConnectPanel: React.FC<{
  title: string;
  description: string;
  onConnect: () => void;
}> = ({ title, description, onConnect }) => {
  const { t } = useTranslation("app");
  return (
    <Panel className="items-center text-center">
      <h2 className="ed-h3">{title}</h2>
      <p className="ed-body mt-2 max-w-[46ch] text-muted-foreground">{description}</p>
      <Button variant="flat-yellow" className="mt-5" onClick={onConnect}>
        {t("common.connectWallet")}
      </Button>
    </Panel>
  );
};

export const ScanningPanel: React.FC<{ label: string }> = ({ label }) => (
  <Panel className="items-center text-center">
    <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
    <p className="ed-body mt-3 font-semibold" aria-live="polite">
      {label}
    </p>
  </Panel>
);

export const ScanFailedPanel: React.FC<{
  title: string;
  description: string;
  onRetry?: () => void;
}> = ({ title, description, onRetry }) => {
  const { t } = useTranslation("app");
  return (
    <Panel tone="yellow-line">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry && (
          <Button variant="flat-outline" size="sm" onClick={onRetry}>
            {t("roles.retry")}
          </Button>
        )}
      </div>
    </Panel>
  );
};

/** Nothing names this wallet: which wallet was checked, and what to try next. */
export const EmptyScanPanel: React.FC<{
  checkedWallet: string;
  title: string;
  description: string;
  children?: ReactNode;
}> = ({ checkedWallet, title, description, children }) => (
  <Panel>
    <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
      {checkedWallet}
    </p>
    <h2 className="ed-h3 mt-3">{title}</h2>
    <p className="ed-body mt-2 max-w-[52ch] text-muted-foreground">{description}</p>
    {children}
  </Panel>
);

/** "You're guardian on 3 estates", the wallet, and any page-wide action. */
export const ScanSummary: React.FC<{ title: string; children?: ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="ed-body font-semibold">{title}</p>
    {children}
  </div>
);
