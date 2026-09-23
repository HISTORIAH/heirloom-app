import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { PageFrame } from "@/components/layout/StocksPage";
import { AsciiCanvas } from "@/components/landing/AsciiCanvas";
import { markScene } from "@/components/landing/ascii";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { Button } from "@/components/ui/button";

/**
 * The 404, on the same ruled page as everything else, sending people back to
 * the portfolio. The mark trails off beside it, the way the landing opens.
 */
const NotFound = () => {
  const { t } = useTranslation("app");
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <PageFrame onConnectWallet={() => setConnectOpen(true)}>
      <section className="hs-col grid gap-10 pb-8 pt-16 md:grid-cols-2 md:items-center md:pt-24">
        <div>
          <span className="hs-tag hs-mono-xs">404</span>
          <h1 className="hs-display mt-5">
            {t("notFound.headline1")} {t("notFound.headline2")}
          </h1>
          <p className="hs-lede mt-5 max-w-[30rem] text-foreground/75">
            {t("notFound.description")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" asChild>
              <Link to="/portfolio">
                <ArrowLeft aria-hidden="true" /> {t("notFound.returnHome")}
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/">{t("common.home")}</Link>
            </Button>
          </div>
        </div>
        <div className="relative h-72 md:h-[26rem]">
          <AsciiCanvas scene={markScene} className="text-foreground" />
        </div>
      </section>
      <WalletConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </PageFrame>
  );
};

export default NotFound;
