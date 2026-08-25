import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
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
  cap?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  cap,
  onConfirm,
  onCancel,
  children,
}) => {
  const { t } = useTranslation("app");
  return (
  <Modal
    open={open}
    role="alertdialog"
    labelledBy="confirm-dialog-title"
    cap={cap ?? t("common.confirm")}
    title={title}
    description={description}
    busy={loading}
    onClose={onCancel}
    footer={
      <>
        <Button
          variant="flat-outline"
          size="default"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {cancelLabel ?? t("common.cancel")}
        </Button>
        <Button
          variant={variant === "destructive" ? "flat-destructive" : "flat"}
          size="default"
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
  </Modal>
  );
};

export default ConfirmDialog;
