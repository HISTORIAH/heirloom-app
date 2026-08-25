import { Check, Loader2, ArrowRight } from "lucide-react";
import { createPortal } from "react-dom";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface SubmitOverlayProps {
  submitState: "creating" | "complete" | "error" | "idle";
  submitProgress: string;
  txId: string | null;
}

/**
 * The page while a signature is out. It is deliberately the quietest screen in
 * the product: one mark, one line of status, and the only link worth having
 * while you wait — the transaction itself.
 */
const SubmitOverlay: React.FC<SubmitOverlayProps> = ({ submitState, submitProgress, txId }) => {
  const { t } = useTranslation("app");
  const isComplete = submitState === "complete";
  const isCreating = submitState === "creating";

  if (!isComplete && !isCreating) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-live="polite" className="scrim z-[60]">
      <div className="sheet rise-in my-auto max-w-md px-6 py-8 text-center">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${
            isComplete ? "border-accent-sage bg-accent-sage" : "border-tile-line bg-tile-soft"
          }`}
        >
          {isComplete ? (
            <Check className="h-6 w-6" strokeWidth={2.5} />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
          )}
        </span>

        <h2 className="mt-6 font-display text-2xl font-semibold tracking-[-0.03em]">
          {isComplete ? t("createVault.wizard.estateCreated") : t("createVault.wizard.creatingEstate")}
        </h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {isComplete
            ? t("createVault.wizard.heartbeatLive")
            : submitProgress || t("createVault.wizard.confirmTx")}
        </p>

        {txId && (
          <a
            href={getSolanaExplorerTxUrl(txId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-tile-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:border-foreground hover:bg-tile-soft"
          >
            {t("common.viewOnExplorer")} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}

        {isComplete && (
          <p className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            {t("createVault.wizard.redirecting")}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default SubmitOverlay;
