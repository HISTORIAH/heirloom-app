import { useMemo, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { DUST_UI_AMOUNT, MINT_SEARCH_MIN_LEN } from "@/lib/constants";
import { cn, formatUsd, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { PickerToken } from "@/types/assets";

const formatBalance = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

const Tag: React.FC<{ dark?: boolean; children: React.ReactNode }> = ({ dark, children }) => (
  <span
    className={cn(
      "ml-1.5 rounded-full px-2 py-[3px] align-middle text-[10px] font-bold uppercase tracking-[0.12em]",
      dark ? "bg-foreground text-background" : "bg-tile-soft text-foreground/80",
    )}
  >
    {children}
  </span>
);

const TokenLine: React.FC<{ token: PickerToken }> = ({ token }) => {
  const { t } = useTranslation("app");
  return (
    <>
      <TokenAvatar
        image={token.image}
        label={token.symbol}
        shape={token.isNft ? "square" : "round"}
      />
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold">
          {token.unverified ? (
            <span className="font-mono text-sm">{truncateAddress(token.mint, 4)}</span>
          ) : (
            token.name
          )}
          {token.isNft && <Tag>{t("addAsset.nftTag")}</Tag>}
          {token.inEstate && <Tag dark>{t("addAsset.inEstateTag")}</Tag>}
        </div>
        <div className="truncate text-[13px] text-muted-foreground">
          {token.unverified ? t("addAsset.unknownToken") : token.symbol}
        </div>
      </div>
      <div className="ml-auto shrink-0 text-right">
        {token.isNft ? (
          <div className="text-[13px] text-muted-foreground">{t("addAsset.oneItem")}</div>
        ) : (
          <>
            <div className="text-sm font-semibold tabular-nums">{formatBalance(token.balance)}</div>
            <div className="text-[13px] text-muted-foreground tabular-nums">
              {token.usdValue !== undefined ? formatUsd(token.usdValue) : t("addAsset.noPrice")}
            </div>
          </>
        )}
      </div>
    </>
  );
};

/** Highest USD value first; unpriced tokens after, by balance. */
const byValue = (a: PickerToken, b: PickerToken) => {
  if (a.usdValue !== undefined && b.usdValue !== undefined) return b.usdValue - a.usdValue;
  if (a.usdValue !== undefined) return -1;
  if (b.usdValue !== undefined) return 1;
  return b.balance - a.balance;
};

export const TokenPicker: React.FC<{
  tokens: PickerToken[];
  selected: PickerToken | null;
  loading: boolean;
  onSelect: (token: PickerToken) => void;
}> = ({ tokens, selected, loading, onSelect }) => {
  const { t } = useTranslation("app");
  const [open, setOpen] = useState(!selected);
  const [query, setQuery] = useState("");
  const [showOther, setShowOther] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (tok: PickerToken) =>
      !q ||
      tok.symbol.toLowerCase().includes(q) ||
      tok.name.toLowerCase().includes(q) ||
      tok.mint.toLowerCase() === q;
    const hidden = (tok: PickerToken) =>
      tok.unverified || (!tok.isNft && !tok.isSol && tok.balance < DUST_UI_AMOUNT);
    const visible = tokens.filter((tok) => !hidden(tok) && match(tok));
    return {
      inEstate: visible.filter((tok) => tok.inEstate && !tok.isNft).sort(byValue),
      fungible: visible.filter((tok) => !tok.inEstate && !tok.isNft).sort(byValue),
      nfts: visible.filter((tok) => tok.isNft),
      other: tokens.filter((tok) => hidden(tok) && match(tok)),
    };
  }, [tokens, query]);

  const pastedMint = query.trim().length >= MINT_SEARCH_MIN_LEN ? query.trim() : null;
  const pastedMatch = pastedMint ? tokens.find((tok) => tok.mint === pastedMint) : undefined;
  const empty =
    !groups.inEstate.length && !groups.fungible.length && !groups.nfts.length && !pastedMint;

  const pick = (token: PickerToken) => {
    onSelect(token);
    setOpen(false);
  };

  const section = (title: string, list: PickerToken[]) =>
    list.length > 0 && (
      <>
        <div className="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        {list.map((tok) => (
          <button
            key={tok.mint}
            type="button"
            onClick={() => pick(tok)}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-tile-soft"
          >
            <TokenLine token={tok} />
          </button>
        ))}
      </>
    );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border transition-colors",
        open ? "border-foreground" : "border-tile-line",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        {selected ? (
          <TokenLine token={selected} />
        ) : (
          <>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tile-soft text-muted-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold text-muted-foreground">
              {t("addAsset.chooseToken")}
            </span>
          </>
        )}
        <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0", !selected && "ml-auto")} />
      </button>

      {open && (
        <div className="border-t border-tile-line">
          <div className="flex items-center gap-2 border-b border-tile-line px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("addAsset.searchPlaceholder")}
              aria-label={t("addAsset.searchPlaceholder")}
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-1 text-[15px] outline-hidden"
            />
          </div>

          <div className="max-h-[min(440px,48vh)] overflow-y-auto">
            {loading && tokens.length <= 1 && (
              <div className="px-3.5 py-4 text-sm text-muted-foreground">{t("addAsset.loading")}</div>
            )}
            {pastedMint && (
              <button
                type="button"
                disabled={!pastedMatch}
                onClick={() => pastedMatch && pick(pastedMatch)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors enabled:hover:bg-tile-soft"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tile-soft font-bold text-muted-foreground">
                  ?
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold">{t("addAsset.addByMint")}</div>
                  <div className="font-mono text-[13px] text-muted-foreground">
                    {pastedMatch ? truncateAddress(pastedMint, 4) : t("addAsset.mintNotInWallet")}
                  </div>
                </div>
              </button>
            )}
            {section(t("addAsset.groupInEstate"), groups.inEstate)}
            {section(t("addAsset.groupYourTokens"), groups.fungible)}
            {section(t("addAsset.groupCollectibles"), groups.nfts)}
            {empty && !loading && (
              <div className="px-3.5 pb-3.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("addAsset.noMatches")}
              </div>
            )}
          </div>

          {groups.other.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowOther((s) => !s)}
                className="w-full border-t border-tile-line px-3.5 py-3 text-left text-[13px] font-semibold text-foreground/80"
              >
                {t(showOther ? "addAsset.hideOther" : "addAsset.showOther", {
                  count: groups.other.length,
                })}
              </button>
              {showOther && (
                <div className="max-h-[min(240px,30vh)] overflow-y-auto">
                  {groups.other.map((tok) => (
                    <button
                      key={tok.mint}
                      type="button"
                      onClick={() => pick(tok)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-tile-soft"
                    >
                      <TokenLine token={tok} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
