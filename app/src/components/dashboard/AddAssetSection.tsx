import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/surface/Modal";
import { TokenPicker } from "@/components/dashboard/modals/TokenPicker";
import { Chip, FieldLabel, FormButton, TxProgress } from "@/components/dashboard/modals/parts";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useRentCost } from "@/hooks/useRentCost";
import { useTxFlow } from "@/hooks/useTxFlow";
import {
  ASSET_RECORD_SPACE,
  NETWORK_FEE_LAMPORTS,
  SOL_DECIMALS,
  SOL_LABEL,
  SOL_MAX_RESERVE,
  TOKEN_ACCOUNT_SPACE,
  WRAPPED_SOL_MINT,
} from "@/lib/constants";
import { formatSol, toRawTokenAmount, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { PickerToken } from "@/types/assets";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const PERCENTS = [25, 50, 75];
const NEW_ASSET_SPACES = [TOKEN_ACCOUNT_SPACE, ASSET_RECORD_SPACE];

/** Trim a computed amount to the token's precision without trailing zeros. */
const toInputAmount = (n: number, decimals: number) =>
  String(Number(Math.max(0, n).toFixed(Math.min(decimals, 9))));

const AddAssetSection: React.FC<Props> = ({ estate, onTx }) => {
  const { t } = useTranslation("app");
  const { registerAssetOnChain, depositSolOnChain, depositTokenOnChain } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { track } = useAnalytics();
  const tx = useTxFlow();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PickerToken | null>(null);
  const [amount, setAmount] = useState("");
  const [pickerKey, setPickerKey] = useState(0);

  const owner = isConnected && open ? publicKey : null;
  const { data: walletTokens, isLoading } = useWalletSplTokens(owner);
  const { sol: walletSol } = useTokenBalances(owner);
  const vaultMints = useMemo(
    () => new Set(estate.vaultTokens.map((vt) => vt.mint)),
    [estate.vaultTokens],
  );

  const baseTokens = useMemo<Omit<PickerToken, "usdValue" | "usdPrice">[]>(() => {
    const seen = new Set<string>();
    const list: Omit<PickerToken, "usdValue" | "usdPrice">[] = [
      {
        mint: WRAPPED_SOL_MINT,
        name: t("addAsset.solName"),
        symbol: SOL_LABEL,
        decimals: SOL_DECIMALS,
        balance: walletSol,
        tokenProgram: "",
        isNft: false,
        inEstate: true,
        isSol: true,
        unverified: false,
      },
    ];
    for (const tok of walletTokens ?? []) {
      // The same mint twice is a bug upstream; keep the first.
      if (seen.has(tok.mint) || tok.mint === WRAPPED_SOL_MINT) continue;
      seen.add(tok.mint);
      // pNFTs sit in frozen accounts the vault can't move, so they're not offered.
      if (tok.frozen || tok.assetInterface === "ProgrammableNFT") continue;
      const isNft =
        (tok.assetInterface?.includes("NFT") ?? false) || (tok.decimals === 0 && tok.amount === 1n);
      list.push({
        mint: tok.mint,
        name: tok.name?.trim() || tok.symbol?.trim() || "",
        symbol: tok.symbol?.trim() || "",
        image: tok.image,
        decimals: tok.decimals,
        balance: tok.uiAmount,
        tokenProgram: tok.tokenProgram,
        isNft,
        inEstate: vaultMints.has(tok.mint),
        isSol: false,
        unverified: !tok.name?.trim() && !tok.symbol?.trim(),
      });
    }
    return list;
  }, [walletTokens, walletSol, vaultMints, t]);

  const { data: prices } = useTokenPrices(
    open ? baseTokens.filter((tok) => !tok.isNft && !tok.unverified).map((tok) => tok.mint) : [],
  );
  const tokens = useMemo<PickerToken[]>(
    () =>
      baseTokens.map((tok) => {
        const usdPrice = prices?.get(tok.mint);
        return { ...tok, usdPrice, usdValue: usdPrice !== undefined ? usdPrice * tok.balance : undefined };
      }),
    [baseTokens, prices],
  );

  const rent = useRentCost(open ? NEW_ASSET_SPACES : []);
  const isNew = !!selected && !selected.inEstate;
  const costLamports = isNew ? (rent ?? 0) + NETWORK_FEE_LAMPORTS : NETWORK_FEE_LAMPORTS;
  const costText = selected
    ? t(isNew ? "addAsset.costNew" : "addAsset.costTopUp", {
        amount: formatSol(costLamports, isNew ? 4 : 6),
      })
    : null;

  const value = Number(amount);
  const over = !!selected && !selected.isNft && value > selected.balance;
  const estateName = estate.label ?? truncateAddress(estate.heir, 4);

  const reset = () => {
    setSelected(null);
    setAmount("");
    setPickerKey((k) => k + 1);
    tx.reset();
  };

  const close = () => {
    if (tx.busy) return;
    setOpen(false);
    reset();
  };

  const submit = async () => {
    if (!selected) return;
    const tok = selected;
    const sent = await tx.run(async () => {
      let id: string;
      if (tok.isSol) {
        id = await depositSolOnChain(estate.vaultPda, toRawTokenAmount(amount, SOL_DECIMALS));
      } else if (tok.inEstate) {
        const holding = estate.vaultTokens.find((vt) => vt.mint === tok.mint);
        if (!holding) throw new Error("Token not found in vault");
        id = await depositTokenOnChain(holding, toRawTokenAmount(amount, tok.decimals));
      } else {
        id = await registerAssetOnChain(estate.heir, {
          mint: tok.mint,
          amount: tok.isNft ? 1n : toRawTokenAmount(amount, tok.decimals),
          decimals: tok.decimals,
          tokenProgram: tok.tokenProgram,
        });
      }
      onTx(id);
      return id;
    });
    const assetType = tok.isSol ? "sol" : "token";
    track(sent ? "asset_added" : "asset_add_failed", { asset_type: assetType });
  };

  let primary: { label: string; enabled: boolean };
  if (!selected) primary = { label: t("addAsset.chooseToken"), enabled: false };
  else if (selected.isNft) primary = { label: t("addAsset.addToEstate"), enabled: true };
  else if (!value) primary = { label: t("addAsset.enterAmount"), enabled: false };
  else if (over) primary = { label: t("addAsset.notEnough", { symbol: selected.symbol }), enabled: false };
  else
    primary = {
      label: t(selected.inEstate ? "addAsset.addMore" : "addAsset.addToEstate"),
      enabled: true,
    };

  const summary = selected
    ? selected.isNft
      ? t("addAsset.doneNft", { name: selected.name, estate: estateName })
      : t("addAsset.doneToken", {
          amount: value.toLocaleString(undefined, { maximumFractionDigits: 6 }),
          symbol: selected.symbol,
          estate: estateName,
        })
    : "";

  const inTx = tx.step !== "idle";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-tile-line px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft"
      >
        <Plus className="h-3.5 w-3.5" /> {t("dashboard.manage.addAssetShort")}
      </button>

      <Modal
        open={open}
        layout="form"
        size="lg"
        cap={inTx ? t("tx.cap") : t("addAsset.cap")}
        title={inTx ? t("addAsset.txTitle") : t("addAsset.title")}
        description={inTx ? (tx.step === "done" ? undefined : t("tx.keepOpen")) : t("addAsset.subtitle")}
        busy={tx.busy}
        onClose={close}
        cost={inTx ? (tx.busy ? t("tx.backgroundNote") : null) : costText}
        footer={
          inTx ? (
            tx.step === "done" ? (
              <FormButton onClick={close}>{t("tx.doneButton")}</FormButton>
            ) : tx.step === "error" ? (
              <>
                <FormButton tone="secondary" onClick={close}>
                  {t("common.close")}
                </FormButton>
                <FormButton onClick={tx.reset}>{t("tx.tryAgain")}</FormButton>
              </>
            ) : null
          ) : (
            <>
              <FormButton tone="secondary" onClick={close}>
                {t("common.cancel")}
              </FormButton>
              <FormButton onClick={submit} disabled={!primary.enabled}>
                {primary.label}
              </FormButton>
            </>
          )
        }
      >
        {inTx ? (
          <TxProgress
            step={tx.step}
            txId={tx.txId}
            error={tx.error}
            doneTitle={t("addAsset.doneTitle")}
            doneSummary={summary}
          />
        ) : (
          <>
            <div>
              <FieldLabel>{t("addAsset.tokenLabel")}</FieldLabel>
              <TokenPicker
                key={pickerKey}
                tokens={tokens}
                selected={selected}
                loading={isLoading}
                onSelect={(tok) => {
                  setSelected(tok);
                  setAmount("");
                }}
              />
            </div>

            {selected?.isNft && (
              <div>
                <FieldLabel>{t("addAsset.itemLabel")}</FieldLabel>
                <div className="flex items-center gap-4 rounded-[14px] border border-tile-line p-3.5">
                  {selected.image ? (
                    <img
                      src={selected.image}
                      alt={selected.name}
                      className="h-[84px] w-[84px] shrink-0 rounded-[10px] border border-tile-line object-cover"
                    />
                  ) : (
                    <div className="h-[84px] w-[84px] shrink-0 rounded-[10px] bg-tile-soft" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{selected.name}</div>
                    <div className="mt-1 text-[13px] text-muted-foreground">{t("addAsset.nftNote")}</div>
                  </div>
                </div>
              </div>
            )}

            {selected && !selected.isNft && (
              <div>
                <FieldLabel
                  htmlFor="add-asset-amount"
                  hint={t("addAsset.walletBalance", {
                    amount: selected.balance.toLocaleString(undefined, { maximumFractionDigits: 4 }),
                    symbol: selected.symbol,
                  })}
                >
                  {t("addAsset.amountLabel")}
                </FieldLabel>
                <div className="rounded-[14px] border border-tile-line p-4 transition-colors focus-within:border-foreground">
                  <div className="flex items-center gap-2.5">
                    <input
                      id="add-asset-amount"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => {
                        const next = e.target.value.replace(/[^0-9.]/g, "");
                        if ((next.match(/\./g) ?? []).length <= 1) setAmount(next);
                      }}
                      className="w-full min-w-0 bg-transparent font-display text-[28px] font-bold tracking-[-0.02em] outline-hidden sm:text-4xl"
                    />
                    <span className="text-[15px] font-semibold text-muted-foreground">{selected.symbol}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                      {selected.usdPrice !== undefined && value > 0
                        ? `≈ ${(value * selected.usdPrice).toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                          })}`
                        : " "}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PERCENTS.map((p) => (
                        <Chip
                          key={p}
                          small
                          on={false}
                          onClick={() =>
                            setAmount(toInputAmount((selected.balance * p) / 100, selected.decimals))
                          }
                        >
                          {p}%
                        </Chip>
                      ))}
                      <Chip
                        small
                        on={false}
                        onClick={() =>
                          setAmount(
                            toInputAmount(
                              selected.isSol ? selected.balance - SOL_MAX_RESERVE : selected.balance,
                              selected.decimals,
                            ),
                          )
                        }
                      >
                        {t("common.max")}
                      </Chip>
                    </div>
                  </div>
                </div>
                {over && <p className="mt-2 text-[13px] text-accent-red">{t("addAsset.overBalance")}</p>}
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default AddAssetSection;
