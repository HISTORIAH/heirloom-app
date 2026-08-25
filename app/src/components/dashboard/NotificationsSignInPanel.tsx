import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  open: boolean;
  /** Human-readable message the wallet will be asked to sign — built and issued by the backend challenge endpoint. */
  message: string;
  signing?: boolean;
  onClose: () => void;
  onSign: () => void;
}

const NotificationsSignInPanel: React.FC<Props> = ({ open, message, signing, onClose, onSign }) => {
  const { t } = useTranslation("app");

  return (
    <Sheet
      open={open}
      title={t("notifications.signInTitle")}
      caption={t("notifications.title")}
      description={t("notifications.signInDesc")}
      busy={signing}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={signing} className="w-full sm:w-auto">
            {t("notifications.cancel")}
          </Button>
          <Button onClick={onSign} disabled={signing} className="w-full sm:w-auto">
            {signing ? t("notifications.signing") : t("notifications.signMessage")}
          </Button>
        </>
      }
    >
      <p className="cap">{t("notifications.signPrompt")}</p>
      {/* The message is shown verbatim: anything a wallet is asked to sign is
          read, not summarised. */}
      <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-tile-line bg-tile-soft p-4 font-mono text-[11px] leading-relaxed">
        {message}
      </pre>

      <div className="mt-4 flex items-start gap-2.5 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        {t("notifications.signNote")}
      </div>
    </Sheet>
  );
};

export default NotificationsSignInPanel;
