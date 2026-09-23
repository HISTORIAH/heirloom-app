import { useState } from "react";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { EXIT_FEE_BPS } from "@historiah/heirloom-stocks";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { PlanForm, PlanSettings } from "@/components/stocks/PlanForms";
import { AmountInput, QueryState, Section } from "@/components/stocks/Section";
import { HealthText, PlanClock } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { useNow, useOwnerOverview } from "@/hooks/useStocks";
import { useStocksTx } from "@/hooks/useStocksTx";
import {
  buildCheckInIx,
  buildClosePlanIx,
  buildInitializePlanIx,
  buildUpdatePlanIx,
  buildVaultAddAssetIx,
  buildVaultDepositIx,
  buildVaultWithdrawIx,
} from "@/lib/stocks";
import { formatPercent, formatUiAmount, parseUiAmount } from "@/lib/format";
import { coverBlockers, holdingLabel } from "@/services/holdings";
import type { MintDetails } from "@/services/mints";
import type { CoveredRow, OwnerOverview, PlanOverview } from "@/services/overview";

const Inherit = () => (
  <StocksPage page="inherit">{(wallet) => <InheritBody wallet={wallet} />}</StocksPage>
);

function InheritBody({ wallet }: { wallet: WalletCtx }) {
  const { t } = useTranslation("stocks");
  const overview = useOwnerOverview(wallet.address);
  const tx = useStocksTx(wallet.signer);

  return (
    <QueryState query={overview}>
      {(data) =>
        data.vault ? (
          <VaultView wallet={wallet} data={data} vault={data.vault} tx={tx} />
        ) : (
          <div className="space-y-6">
            <p className="ed-body max-w-3xl text-muted-foreground">{t("inherit.tradeoff")}</p>
            <PlanForm
              mode="vault"
              owner={wallet.address}
              pending={tx.pending === "create"}
              onSubmit={(input) =>
                tx.run("create", {
                  done: "createVault",
                  build: async () => [[await buildInitializePlanIx(wallet.signer, "vault", input)]],
                })
              }
            />
          </div>
        )
      }
    </QueryState>
  );
}

/**
 * An amount typed in display units, or an exact raw amount after Max — the
 * multiplier makes a round trip through display units lossy, and Max has to
 * mean every last raw unit.
 */
function useAmount() {
  const [text, setText] = useState("");
  const [exact, setExact] = useState<bigint | null>(null);
  return {
    text,
    set: (value: string) => {
      setText(value);
      setExact(null);
    },
    max: (raw: bigint, display: string) => {
      setText(display);
      setExact(raw);
    },
    raw: (mint: MintDetails, now: number) => exact ?? parseUiAmount(text, mint, now),
    reset: () => {
      setText("");
      setExact(null);
    },
  };
}

function VaultView({
  wallet,
  data,
  vault,
  tx,
}: {
  wallet: WalletCtx;
  data: OwnerOverview;
  vault: PlanOverview;
  tx: ReturnType<typeof useStocksTx>;
}) {
  const { t } = useTranslation("stocks");
  const now = useNow();

  return (
    <div className="space-y-10">
      <Panel tone="sage" className="gap-4">
        <PanelCap className="text-foreground/55">{t("inherit.planTitle")}</PanelCap>
        <PlanClock plan={vault.plan} now={now} />
        <Button
          variant="flat"
          className="self-start"
          disabled={tx.pending !== null}
          onClick={() =>
            tx.run("checkin", {
              done: "checkIn",
              build: async () => [
                [await buildCheckInIx(wallet.signer, { owner: wallet.address, mode: "vault" })],
              ],
            })
          }
        >
          {tx.pending === "checkin" ? t("tx.signing") : t("common.checkIn")}
        </Button>
      </Panel>

      <Section title={t("inherit.contentsTitle")}>
        {vault.rows.length === 0 ? (
          <p className="text-muted-foreground">{t("inherit.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {vault.rows.map((row) => (
              <VaultRow key={row.record.address} row={row} data={data} wallet={wallet} tx={tx} />
            ))}
          </ul>
        )}
      </Section>

      <AddToVault data={data} vault={vault} wallet={wallet} tx={tx} />

      <PlanSettings
        plan={vault.plan}
        pending={tx.pending}
        onSave={(changes) =>
          tx.run("settings", {
            done: "settings",
            build: async () => [[await buildUpdatePlanIx(wallet.signer, "vault", changes)]],
          })
        }
        onClose={() =>
          tx.run("close", {
            done: "closePlan",
            build: async () => [[await buildClosePlanIx(wallet.signer, "vault")]],
          })
        }
      />
    </div>
  );
}

function VaultRow({
  row,
  data,
  wallet,
  tx,
}: {
  row: CoveredRow;
  data: OwnerOverview;
  wallet: WalletCtx;
  tx: ReturnType<typeof useStocksTx>;
}) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const amount = useAmount();

  const vaulted = row.position?.amount ?? 0n;
  const wallet_ = data.holdings.find(
    (h) => h.mint.mint === row.mint.mint && h.position.amount > 0n,
  );
  const limit = mode === "withdraw" ? vaulted : (wallet_?.position.amount ?? 0n);
  const id = `${mode}-${row.record.address}`;

  const submit = () => {
    const raw = amount.raw(row.mint, now);
    if (!raw || raw > limit || !mode) return;
    tx.run(id, {
      done: mode === "withdraw" ? "vaultWithdraw" : "vaultDeposit",
      build: async () => [
        [
          mode === "withdraw"
            ? await buildVaultWithdrawIx(wallet.signer, row.mint, raw)
            : await buildVaultDepositIx(
                wallet.signer,
                row.mint,
                raw,
                wallet_?.position.tokenAccount,
              ),
        ],
      ],
    }).then((ok) => {
      if (ok) {
        amount.reset();
        setMode(null);
      }
    });
  };

  return (
    <li>
      <Panel tone="paper" className="gap-4">
        <div className="gap-4 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
          <AssetBadge mint={row.mint} catalog={row.catalog} />
          <p className="font-semibold tabular-nums">
            {formatUiAmount(vaulted, row.mint, now, locale)}
          </p>
          <HealthText health={row.health} withHint />
          <div className="flex gap-2 md:justify-self-end">
            <Button
              variant={mode === "deposit" ? "flat" : "flat-outline"}
              size="sm"
              disabled={!wallet_}
              onClick={() => setMode(mode === "deposit" ? null : "deposit")}
            >
              {t("inherit.deposit")}
            </Button>
            <Button
              variant={mode === "withdraw" ? "flat" : "flat-outline"}
              size="sm"
              disabled={vaulted === 0n}
              onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
            >
              {t("inherit.withdraw")}
            </Button>
          </div>
        </div>
        {mode && (
          <div className="flex flex-wrap items-center gap-3 border-t border-tile-line pt-4">
            <AmountInput
              id={`${id}-amount`}
              label={t("common.amount")}
              value={amount.text}
              onChange={amount.set}
              onMax={() => amount.max(limit, formatUiAmount(limit, row.mint, now, locale))}
            />
            <Button variant="flat-yellow" size="sm" disabled={tx.pending !== null} onClick={submit}>
              {tx.pending === id
                ? t("tx.signing")
                : mode === "withdraw"
                  ? t("inherit.withdraw")
                  : t("inherit.deposit")}
            </Button>
            {mode === "withdraw" && (
              <p className="text-sm text-muted-foreground">
                {t("inherit.withdrawNote", { fee: formatPercent(EXIT_FEE_BPS / 10_000, locale) })}
              </p>
            )}
          </div>
        )}
      </Panel>
    </li>
  );
}

function AddToVault({
  data,
  vault,
  wallet,
  tx,
}: {
  data: OwnerOverview;
  vault: PlanOverview;
  wallet: WalletCtx;
  tx: ReturnType<typeof useStocksTx>;
}) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();
  const amount = useAmount();

  const inVault = new Set<Address>(vault.rows.map((r) => r.record.mint));
  const options = data.holdings.filter(
    (h) => h.position.amount > 0n && !inVault.has(h.mint.mint) && coverBlockers(h).length === 0,
  );
  const [chosen, setChosen] = useState<string>("");
  const holding = options.find((h) => h.position.tokenAccount === chosen) ?? null;

  const submit = () => {
    if (!holding?.mint.mintAuthority) return;
    const raw = amount.raw(holding.mint, now);
    if (!raw || raw > holding.position.amount) return;
    const mintAuthority = holding.mint.mintAuthority;
    tx.run("add", {
      done: "vaultAdd",
      build: async () => [
        [
          await buildVaultAddAssetIx(
            wallet.signer,
            { ...holding.mint, mintAuthority },
            raw,
            holding.position.tokenAccount,
          ),
        ],
      ],
    }).then((ok) => {
      if (ok) {
        amount.reset();
        setChosen("");
      }
    });
  };

  return (
    <Section title={t("inherit.addTitle")} description={t("inherit.addDescription")}>
      {options.length === 0 ? (
        <p className="text-muted-foreground">{t("inherit.nothingToAdd")}</p>
      ) : (
        <Panel tone="paper" className="gap-4 md:flex-row md:flex-wrap md:items-center">
          <label htmlFor="vault-add-stock" className="sr-only">
            {t("inherit.chooseStock")}
          </label>
          <select
            id="vault-add-stock"
            value={chosen}
            onChange={(e) => {
              setChosen(e.target.value);
              amount.reset();
            }}
            className="ed-input md:w-72"
          >
            <option value="">{t("inherit.choose")}</option>
            {options.map((h) => (
              <option key={h.position.tokenAccount} value={h.position.tokenAccount}>
                {holdingLabel(h).symbol} — {formatUiAmount(h.position.amount, h.mint, now, locale)}
              </option>
            ))}
          </select>
          {holding && (
            <AmountInput
              id="vault-add-amount"
              label={t("common.amount")}
              value={amount.text}
              onChange={amount.set}
              onMax={() =>
                amount.max(
                  holding.position.amount,
                  formatUiAmount(holding.position.amount, holding.mint, now, locale),
                )
              }
            />
          )}
          <Button variant="flat-yellow" disabled={!holding || tx.pending !== null} onClick={submit}>
            {tx.pending === "add" ? t("tx.signing") : t("inherit.add")}
          </Button>
        </Panel>
      )}
    </Section>
  );
}

export default Inherit;
