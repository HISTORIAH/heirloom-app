import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Panel } from "@/components/surface/Panel";
import { STATE_DOT, statusMeta, type UiState } from "@/components/dashboard/estateState";
import { cn, getSolanaExplorerTxUrl } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

export const EstateGlance: React.FC<{
  label: string;
  state: string;
  children: ReactNode;
}> = ({ label, state, children }) => {
  const { t } = useTranslation("app");
  const ui = (state in STATE_DOT ? state : "active") as UiState;
  return (
    <Panel className="gap-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ed-label">{t("common.estate")}</p>
          <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight">{label}</p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", STATE_DOT[ui])} />
          <span className="text-sm font-semibold">{statusMeta(t)[ui].label}</span>
        </span>
      </div>
      {children}
    </Panel>
  );
};

export const GlanceRow: React.FC<{ label: string; value: ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5">
    <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className={cn("min-w-0 text-right text-sm font-semibold", mono && "break-all font-mono")}>
      {value}
    </span>
  </div>
);

export const GlanceStats: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="mt-5 divide-y divide-tile-line border-y border-tile-line">{children}</div>
);

export const ExplorerLink: React.FC<{ txId: string; children: ReactNode }> = ({ txId, children }) => (
  <a
    href={getSolanaExplorerTxUrl(txId)}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:text-muted-foreground"
  >
    {children}
    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
  </a>
);
