import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { getSolanaExplorerTxUrl } from "@/lib/utils";

interface SubmitOverlayProps {
  submitState: "creating" | "complete" | "error" | "idle";
  submitProgress: string;
  txId: string | null;
}

const SubmitOverlay: React.FC<SubmitOverlayProps> = ({ submitState, submitProgress, txId }) => {
  const isComplete = submitState === "complete";
  const isCreating = submitState === "creating";

  if (!isComplete && !isCreating) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
    >
      <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
        {isComplete ? (
          <>
            <div className="bg-accent-lime neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-normal mb-3">Estate Created!</h2>
            <p className="text-lg font-medium text-muted-foreground mb-4">
              Your heartbeat is live on-chain.
            </p>
          </>
        ) : (
          <>
            <div className="bg-accent-yellow neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-normal mb-3">Creating Estate…</h2>
            <p className="text-lg font-medium text-muted-foreground mb-4">
              {submitProgress || "Confirm the transaction in your wallet"}
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2 justify-center items-center">
          {txId && (
            <a
              href={getSolanaExplorerTxUrl(txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
            >
              View on Explorer <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
        {isComplete && (
          <div className="flex items-center justify-center gap-2 mt-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            Redirecting to dashboard…
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitOverlay;
