import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  accent?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  accent,
  icon,
  onConfirm,
  onCancel,
  children,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const resolvedAccent =
    accent ?? (variant === "destructive" ? "bg-accent-red/20" : "bg-accent-cyan/20");
  const resolvedIcon =
    icon ?? <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-desc" : undefined}
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6 text-foreground"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="neo-card-static max-w-md w-full neo-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`${resolvedAccent} neo-border rounded-xl p-3 shrink-0`}>
            {resolvedIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-xl leading-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p
                id="confirm-dialog-desc"
                className="text-sm font-medium text-muted-foreground mt-2"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button
            ref={cancelRef}
            variant="outline"
            size="default"
            onClick={onCancel}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="default"
            onClick={onConfirm}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Working…</>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
