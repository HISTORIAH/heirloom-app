import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  /** Retained for call-site compatibility; the sheet's head carries the tone now. */
  accent?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

/**
 * The confirmation before anything on-chain. It is the same sheet every other
 * overlay uses; only the head changes colour, and only when the action cannot
 * be taken back.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  icon,
  onConfirm,
  onCancel,
  children,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation("app");

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      prev?.focus?.();
    };
  }, [open]);

  return (
    <Sheet
      open={open}
      role="alertdialog"
      labelledBy="confirm-dialog-title"
      title={title}
      tone={variant === "destructive" ? "alert" : "paper"}
      icon={icon ?? <AlertTriangle strokeWidth={2} />}
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("common.working")}</>
            ) : (
              confirmLabel ?? t("common.confirm")
            )}
          </Button>
        </>
      }
    >
      {description && (
        <p id="confirm-dialog-desc" className="text-sm font-medium leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </Sheet>
  );
};

export default ConfirmDialog;
