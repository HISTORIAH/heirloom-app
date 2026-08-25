import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  /** Small uppercase line above the title — which part of the app this belongs to. */
  caption?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

/**
 * The confirmation before anything on-chain. It is the same sheet every other
 * overlay uses — the weight of the action is carried by the confirm button,
 * which is the only red thing on the screen when the move cannot be undone.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  caption,
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
      caption={caption}
      description={description}
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
      {children}
    </Sheet>
  );
};

export default ConfirmDialog;
