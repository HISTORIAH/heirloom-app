import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  open: boolean;
  /** Human-readable message the wallet will be asked to sign — built and issued by the backend challenge endpoint. */
  message: string;
  signing?: boolean;
  onClose: () => void;
  onSign: () => void;
}

const NotificationsSignInPanel: React.FC<Props> = ({
  open,
  message,
  signing,
  onClose,
  onSign,
}) => {
  const { t } = useTranslation("app");
  return (
  <Modal
    open={open}
    cap={t("notifications.title")}
    title={t("notifications.proveWallet")}
    description={t("notifications.proveWalletDesc")}
    busy={signing}
    onClose={onClose}
    footer={
      <>
        <Button
          variant="flat-outline"
          className="flex-1 sm:flex-none"
          onClick={onClose}
          disabled={signing}
        >
          {t("common.cancel")}
        </Button>
        <Button
          variant="flat"
          className="flex-1 sm:flex-none"
          onClick={onSign}
          disabled={signing}
        >
          {signing ? t("notifications.signing") : t("notifications.signMessage")}
        </Button>
      </>
    }
  >
    <p className="ed-label">{t("notifications.youWillSign")}</p>
    <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-tile-line bg-tile-soft p-4 font-mono text-[11px] leading-relaxed">
      {message}
    </pre>
    <p className="mt-4 flex items-start gap-2 text-xs font-medium text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      {t("notifications.signCostsNothing")}
    </p>
  </Modal>
  );
};

export default NotificationsSignInPanel;
