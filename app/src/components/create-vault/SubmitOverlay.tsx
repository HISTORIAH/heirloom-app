import { Loader2 } from "lucide-react";
import { Modal } from "@/components/surface/Modal";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface SubmitOverlayProps {
  submitState: "creating" | "complete" | "error" | "idle";
  submitProgress: string;
  txId: string | null;
}

const SubmitOverlay: React.FC<SubmitOverlayProps> = ({
  submitState,
  submitProgress,
  txId,
}) => {
  const { t } = useTranslation("app");
  const isCreating = submitState === "creating";
  const isComplete = submitState === "complete";

  if (!isCreating && !isComplete) return null;

  return (
    <Modal
      open
      closable={false}
      cap={t("common.estate")}
      labelledBy="submit-overlay-title"
      title={
        isComplete
          ? t("createVault.wizard.estateCreated")
          : t("createVault.wizard.creatingEstate")
      }
      description={
        isComplete ? (
          t("createVault.wizard.heartbeatLive")
        ) : (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            {submitProgress || t("createVault.wizard.confirmTx")}
          </span>
        )
      }
      onClose={() => {}}
    >
      {txId && (
        <a
          href={getSolanaExplorerTxUrl(txId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold underline underline-offset-4"
        >
          {t("common.viewOnExplorer")}
        </a>
      )}
    </Modal>
  );
};

export default SubmitOverlay;
