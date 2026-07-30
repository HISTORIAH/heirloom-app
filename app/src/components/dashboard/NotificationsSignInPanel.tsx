import { Lock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  /** Human-readable message the wallet will be asked to sign — built and issued by the backend challenge endpoint. */
  message: string;
  signing?: boolean;
  onClose: () => void;
  onSign: () => void;
}

const NotificationsSignInPanel: React.FC<Props> = ({ open, message, signing, onClose, onSign }) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      onClick={() => !signing && onClose()}
    >
      <div className="neo-card-static max-w-md w-full neo-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="bg-accent-cyan neo-border rounded-xl p-3 shrink-0">
              <Lock className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl leading-tight">Sign in to manage notifications</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Contact details are private to this estate. Prove you own this wallet — nothing more.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={signing}
            className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          You'll be asked to sign this exact message
        </p>
        <pre className="neo-border rounded-lg p-4 bg-secondary/40 text-[11px] leading-relaxed font-mono whitespace-pre-wrap mb-4">
          {message}
        </pre>

        <div className="flex items-start gap-2 text-xs text-muted-foreground font-medium mb-6">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-accent-purple" strokeWidth={2} />
          No transaction, no gas, no wallet connection request — just a signature, valid for this session only.
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={signing}>
            Cancel
          </Button>
          <Button variant="cyan" className="flex-1" onClick={onSign} disabled={signing}>
            {signing ? "Signing…" : "Sign message"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSignInPanel;
