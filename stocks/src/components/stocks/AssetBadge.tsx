import { useState } from "react";
import { useTranslation } from "@heirloom/i18n";
import type { CatalogEntry } from "@/services/catalog";
import { holdingLabel, type IssuerInfo } from "@/services/holdings";
import type { MintDetails } from "@/services/mints";
import { cn, getTokenAccent } from "@/lib/utils";

/**
 * A stock's logo, symbol, and name, with its issuer when known. Only the mint's
 * address and metadata labels are read, so a catalog listing with no chain
 * data behind it renders the same way.
 */
export const AssetBadge: React.FC<{
  mint: Pick<MintDetails, "mint" | "name" | "symbol">;
  catalog: CatalogEntry | null;
  issuer?: IssuerInfo | null;
  className?: string;
}> = ({ mint, catalog, issuer, className }) => {
  const { t } = useTranslation("stocks");
  const { symbol, name } = holdingLabel({ mint, catalog });
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = catalog?.logo && !logoFailed ? catalog.logo : null;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {logo ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className="h-10 w-10 shrink-0 rounded-lg border border-tile-line object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-bold",
            getTokenAccent(mint.mint).bg,
          )}
        >
          {symbol.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-bold">{symbol}</p>
        <p className="truncate text-sm text-muted-foreground">
          {name}
          {issuer !== undefined && (
            <>
              {" · "}
              {issuer ? issuer.label : t("common.unknownIssuer")}
            </>
          )}
        </p>
      </div>
    </div>
  );
};
