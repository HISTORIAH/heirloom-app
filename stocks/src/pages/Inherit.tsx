import { useState } from "react";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { EXIT_FEE_BPS } from "@historiah/heirloom-stocks";
import { StocksPage } from "@/components/layout/StocksPage";
import { Cap, Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { PlanForm, PlanSettings } from "@/components/stocks/PlanForms";
import {
  AmountInput,
  Cell,
  List,
  Notice,
  QueryState,
  Row,
  Section,
} from "@/components/stocks/Section";
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
import { cn } from "@/lib/utils";

const VAULT_COLS = "minmax(0,1.6fr) minmax(0,0.9fr) minmax(0,1.5fr) minmax(13rem,auto)";

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
            <Notice className="max-w-3xl">{t("inherit.tradeoff")}</Notice>
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
    <div className="space-y-14">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel tone="sage" className="gap-7">
          <Cap>{t("inherit.planTitle")}</Cap>
          <PlanClock plan={vault.plan} now={now} />
          <div className="mt-auto">
            <Button
              variant="ink"
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
          </div>
        </Panel>
        <Panel tone="soft" className="justify-between gap-6">
          <h2 className="hs-h4">{t("inherit.tradeoffTitle")}</h2>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/75">
            {t("inherit.tradeoff")}
          </p>
        </Panel>
      </div>

      <Section title={t("inherit.contentsTitle")}>
        {vault.rows.length === 0 ? (
          <p className="hs-sheet px-5 py-4 text-sm text-muted-foreground">{t("inherit.empty")}</p>
        ) : (
          <List
            cols={VAULT_COLS}
            head={[t("columns.stock"), t("columns.inVault"), t("columns.status"), ""]}
          >
            {vault.rows.map((row) => (
              <VaultRow key={row.record.address} row={row} data={data} wallet={wallet} tx={tx} />
            ))}
          </List>
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
    <Row className={cn(mode && "bg-tile-soft/70")}>
      <AssetBadge mint={row.mint} catalog={row.catalog} />
      <Cell label={t("columns.inVault")}>
        <p className="font-medium tabular-nums">
          {formatUiAmount(vaulted, row.mint, now, locale)}
        </p>
      </Cell>
      <Cell label={t("columns.status")}>
        <HealthText health={row.health} withHint />
      </Cell>
      <div className="flex gap-2 md:justify-self-end">
        <button
          type="button"
          className="hs-pill h-9"
          aria-pressed={mode === "deposit"}
          disabled={!wallet_}
          onClick={() => setMode(mode === "deposit" ? null : "deposit")}
        >
          {t("inherit.deposit")}
        </button>
        <button
          type="button"
          className="hs-pill h-9"
          aria-pressed={mode === "withdraw"}
          disabled={vaulted === 0n}
          onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
        >
          {t("inherit.withdraw")}
        </button>
      </div>
      {mode && (
        // Spans the row, under its cells, so the amount sits with its stock.
        <div className="hs-rise flex flex-wrap items-center gap-3 border-t border-tile-line pt-4 md:col-span-full">
          <AmountInput
            id={`${id}-amount`}
            label={t("common.amount")}
            value={amount.text}
            onChange={amount.set}
            onMax={() => amount.max(limit, formatUiAmount(limit, row.mint, now, locale))}
          />
          <Button variant="primary" disabled={tx.pending !== null} onClick={submit}>
            {tx.pending === id
              ? t("tx.signing")
              : mode === "withdraw"
                ? t("inherit.withdraw")
                : t("inherit.deposit")}
          </Button>
          {mode === "withdraw" && (
            <p className="hs-mono-xs text-muted-foreground">
              {t("inherit.withdrawNote", { fee: formatPercent(EXIT_FEE_BPS / 10_000, locale) })}
            </p>
          )}
        </div>
      )}
    </Row>
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
        <p className="hs-sheet px-5 py-4 text-sm text-muted-foreground">
          {t("inherit.nothingToAdd")}
        </p>
      ) : (
        <div className="hs-sheet flex flex-col gap-4 p-5 md:flex-row md:flex-wrap md:items-end md:p-6">
          <div className="space-y-2 md:w-72">
            <label htmlFor="vault-add-stock" className="hs-label">
              {t("inherit.chooseStock")}
            </label>
            <select
              id="vault-add-stock"
              value={chosen}
              onChange={(e) => {
                setChosen(e.target.value);
                amount.reset();
              }}
              className="hs-input"
            >
              <option value="">{t("inherit.choose")}</option>
              {options.map((h) => (
                <option key={h.position.tokenAccount} value={h.position.tokenAccount}>
                  {holdingLabel(h).symbol} — {formatUiAmount(h.position.amount, h.mint, now, locale)}
                </option>
              ))}
            </select>
          </div>
          {holding && (
            <div className="space-y-2">
              <p className="hs-label" aria-hidden="true">
                {t("common.amount")}
              </p>
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
            </div>
          )}
          <Button variant="primary" disabled={!holding || tx.pending !== null} onClick={submit}>
            {tx.pending === "add" ? t("tx.signing") : t("inherit.add")}
          </Button>
        </div>
      )}
    </Section>
  );
}

export default Inherit;
