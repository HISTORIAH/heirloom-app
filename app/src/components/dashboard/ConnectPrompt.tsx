import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import VaultMark from "@/components/VaultMark";
import { DOCS_URL } from "@/config";
import { useTranslation } from "@heirloom/i18n";

/**
 * The dashboard with no wallet. The heir button repeats the nav's Inherit on purpose,
 * for the visitor who came to claim and never looked up.
 */
export const ConnectPrompt: React.FC<{ onConnect: () => void }> = ({ onConnect }) => {
  const { t } = useTranslation("app");
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-9 px-[var(--page-pad)] py-[clamp(3rem,10vh,6rem)] text-center"
      data-tour="dashboard-actions"
    >
      <VaultMark className="h-24 w-24 text-tile-line" />

      <div className="flex max-w-[620px] flex-col items-center gap-3.5">
        <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">
          {t("dashboard.connectTitle")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("dashboard.connectSub")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="flat-yellow"
          onClick={onConnect}
          className="h-14 rounded-xl px-7 text-sm tracking-[0.1em]"
        >
          <Wallet /> {t("dashboard.connectWallet")}
        </Button>
        <Button
          variant="flat-outline"
          asChild
          className="h-14 rounded-xl border px-6 text-sm tracking-[0.1em]"
        >
          <Link to="/inherit">{t("dashboard.namedAnHeir")}</Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("dashboard.newToHeirloom")}{" "}
        <a
          href={DOCS_URL}
          className="font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          {t("dashboard.howItWorks")}
        </a>
      </p>
    </main>
  );
};
