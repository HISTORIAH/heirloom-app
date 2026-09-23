import type { CSSProperties } from "react";
import { useTranslation } from "@heirloom/i18n";
import { RECOVERY_FEE_BPS } from "@historiah/heirloom-stocks";
import { StocksPage } from "@/components/layout/StocksPage";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { Cell, EmptyState, QueryState, Row } from "@/components/stocks/Section";
import { HealthText, PlanClock } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { useNamedPlans, useNow } from "@/hooks/useStocks";
import { useStocksTx } from "@/hooks/useStocksTx";
import {
  buildCheckInIx,
  buildGuardianDeferIx,
  buildRecoverIx,
  buildVaultClaimIx,
} from "@/lib/stocks";
import {
  formatDate,
  formatPercent,
  formatUiAmount,
  SECONDS_PER_DAY,
  truncateAddress,
} from "@/lib/format";
import type { CoveredRow, NamedPlanOverview } from "@/services/overview";
import { canDefer, planTimeline } from "@/services/plans";

const PAYOUT_COLS = "minmax(0,1.4fr) minmax(0,0.9fr) minmax(0,1.6fr) minmax(7rem,auto)";

/** Recoveries or claims per transaction; each may create two token accounts. */
const PAYOUTS_PER_TX = 2;

const Recover = () => (
  <StocksPage page="recover">{(wallet) => <RecoverBody wallet={wallet} />}</StocksPage>
);

function RecoverBody({ wallet }: { wallet: WalletCtx }) {
  const { t } = useTranslation("stocks");
  const named = useNamedPlans(wallet.address);
  const tx = useStocksTx(wallet.signer);

  return (
    <QueryState query={named}>
      {(plans) =>
        plans.length === 0 ? (
          <EmptyState title={t("recover.emptyTitle")} description={t("recover.emptyDescription")} />
        ) : (
          <div className="space-y-8">
            {plans.map((named) => (
              <NamedPlanPanel key={named.plan.address} named={named} wallet={wallet} tx={tx} />
            ))}
          </div>
        )
      }
    </QueryState>
  );
}

/** The raw amount a payout would move: the allocated share in backup mode, everything in a vault. */
function payoutAmount(row: CoveredRow, mode: "backup" | "vault"): bigint {
  const balance = row.position?.amount ?? 0n;
  return mode === "backup" ? (balance * BigInt(row.record.allocationBps)) / 10_000n : balance;
}

function NamedPlanPanel({
  named,
  wallet,
  tx,
}: {
  named: NamedPlanOverview;
  wallet: WalletCtx;
  tx: ReturnType<typeof useStocksTx>;
}) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();
  const { plan, roles, rows } = named;
  const timeline = planTimeline(plan, now);
  const recoverable = timeline.phase === "recoverable";
  const planRef = { owner: plan.owner, mode: plan.mode };

  const ready = rows.filter((row) => row.health === "covered" && payoutAmount(row, plan.mode) > 0n);

  const payout = async (row: CoveredRow) =>
    plan.mode === "backup"
      ? buildRecoverIx(wallet.signer, {
          owner: plan.owner,
          asset: row.mint,
          sourceTokenAccount: row.record.sourceTokenAccount,
        })
      : buildVaultClaimIx(wallet.signer, { owner: plan.owner, asset: row.mint });

  const payAll = () =>
    tx.run(`all-${plan.address}`, {
      done: plan.mode === "backup" ? "recover" : "claim",
      build: async () => {
        const instructions = await Promise.all(ready.map(payout));
        const batches = [];
        for (let i = 0; i < instructions.length; i += PAYOUTS_PER_TX) {
          batches.push(instructions.slice(i, i + PAYOUTS_PER_TX));
        }
        return batches;
      },
    });

  const payoutLabel = plan.mode === "backup" ? t("recover.recover") : t("recover.claim");

  return (
    <section className="hs-sheet overflow-hidden">
      {/* Whose plan, what this wallet is to it, and where its clock stands. */}
      <header className="grid gap-8 px-6 py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:px-8">
        <div className="space-y-4">
          <h2 className="hs-h3">
            {plan.mode === "backup"
              ? t("recover.backupOf", { owner: truncateAddress(plan.owner, 6) })
              : t("recover.vaultOf", { owner: truncateAddress(plan.owner, 6) })}
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <li key={role} className="hs-chip">
                {t(`recover.roles.${role}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-tile-line bg-tile-soft p-5">
          <PlanClock plan={plan} now={now} />
        </div>
      </header>

      {(roles.includes("checkin") || roles.includes("guardian")) && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-tile-line px-6 py-5 md:px-8">
          {roles.includes("checkin") && (
            <Button
              variant="ink"
              disabled={tx.pending !== null}
              onClick={() =>
                tx.run(`checkin-${plan.address}`, {
                  done: "checkIn",
                  build: async () => [[await buildCheckInIx(wallet.signer, planRef)]],
                })
              }
            >
              {tx.pending === `checkin-${plan.address}` ? t("tx.signing") : t("common.checkIn")}
            </Button>
          )}
          {roles.includes("guardian") &&
            (canDefer(plan, now) ? (
              <Button
                variant="ghost"
                disabled={tx.pending !== null}
                onClick={() =>
                  tx.run(`defer-${plan.address}`, {
                    done: "defer",
                    build: async () => [[await buildGuardianDeferIx(wallet.signer, planRef)]],
                  })
                }
              >
                {tx.pending === `defer-${plan.address}`
                  ? t("tx.signing")
                  : t("recover.defer", {
                      duration: t("common.days", {
                        count: Math.round(plan.pauseDurationSecs / SECONDS_PER_DAY),
                      }),
                    })}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t("recover.deferUnavailable")}</p>
            ))}
        </div>
      )}

      {roles.includes("destination") && (
        <>
          {rows.length > 0 && (
            <div className="border-t border-tile-line" style={{ "--cols": PAYOUT_COLS } as CSSProperties}>
              <div className="hs-list-head md:px-8" aria-hidden="true">
                <span>{t("columns.stock")}</span>
                <span>{t("columns.moves")}</span>
                <span>{t("columns.status")}</span>
                <span />
              </div>
              {rows.map((row) => {
                const id = `payout-${row.record.address}`;
                const amount = payoutAmount(row, plan.mode);
                return (
                  <Row key={row.record.address} className="md:px-8">
                    <AssetBadge mint={row.mint} catalog={row.catalog} />
                    <Cell label={t("recover.willMove")}>
                      <p className="font-medium tabular-nums">
                        {formatUiAmount(amount, row.mint, now, locale)}
                      </p>
                    </Cell>
                    <Cell label={t("columns.status")}>
                      <HealthText health={row.health} withHint />
                    </Cell>
                    <div className="md:justify-self-end">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={
                          tx.pending !== null ||
                          !recoverable ||
                          row.health !== "covered" ||
                          amount === 0n
                        }
                        onClick={() =>
                          tx.run(id, {
                            done: plan.mode === "backup" ? "recover" : "claim",
                            build: async () => [[await payout(row)]],
                          })
                        }
                      >
                        {tx.pending === id ? t("tx.signing") : payoutLabel}
                      </Button>
                    </div>
                  </Row>
                );
              })}
            </div>
          )}

          <footer className="flex flex-col gap-4 border-t border-tile-line bg-tile-soft px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex flex-wrap items-center gap-3">
              {recoverable ? (
                ready.length > 1 ? (
                  <Button variant="primary" disabled={tx.pending !== null} onClick={payAll}>
                    {tx.pending === `all-${plan.address}`
                      ? t("tx.signing")
                      : plan.mode === "backup"
                        ? t("recover.recoverAll")
                        : t("recover.claimAll")}
                  </Button>
                ) : (
                  ready.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("recover.nothingToRecover")}</p>
                  )
                )
              ) : (
                <p className="text-sm font-medium">
                  {t("recover.notYet", { date: formatDate(timeline.recoverableAt, locale) })}
                </p>
              )}
            </div>
            <p className="hs-mono-xs text-muted-foreground">
              {t("recover.feeNote", { fee: formatPercent(RECOVERY_FEE_BPS / 10_000, locale) })}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}

export default Recover;
