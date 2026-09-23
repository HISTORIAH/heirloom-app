import { useTranslation } from "@heirloom/i18n";
import { RECOVERY_FEE_BPS } from "@historiah/heirloom-stocks";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { EmptyState, QueryState } from "@/components/stocks/Section";
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
          <div className="space-y-6">
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

  return (
    <Panel tone="paper" className="gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <h2 className="ed-h3">
            {plan.mode === "backup"
              ? t("recover.backupOf", { owner: truncateAddress(plan.owner, 6) })
              : t("recover.vaultOf", { owner: truncateAddress(plan.owner, 6) })}
          </h2>
          <ul className="space-y-1">
            {roles.map((role) => (
              <li key={role} className="text-sm font-semibold">
                {t(`recover.roles.${role}`)}
              </li>
            ))}
          </ul>
        </div>
        <PlanClock plan={plan} now={now} />
      </div>

      {(roles.includes("checkin") || roles.includes("guardian")) && (
        <div className="flex flex-wrap items-center gap-3">
          {roles.includes("checkin") && (
            <Button
              variant="flat"
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
                variant="flat-outline"
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
        <div className="space-y-4">
          {rows.length > 0 && (
            <ul className="space-y-3">
              {rows.map((row) => {
                const id = `payout-${row.record.address}`;
                const amount = payoutAmount(row, plan.mode);
                return (
                  <li key={row.record.address}>
                    <Panel
                      tone="soft"
                      className="gap-4 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-center"
                    >
                      <AssetBadge mint={row.mint} catalog={row.catalog} />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("recover.willMove")}</p>
                        <p className="font-semibold tabular-nums">
                          {formatUiAmount(amount, row.mint, now, locale)}
                        </p>
                      </div>
                      <HealthText health={row.health} withHint />
                      <Button
                        variant="flat-yellow"
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
                        {tx.pending === id
                          ? t("tx.signing")
                          : plan.mode === "backup"
                            ? t("recover.recover")
                            : t("recover.claim")}
                      </Button>
                    </Panel>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {recoverable ? (
              ready.length > 1 && (
                <Button variant="flat-yellow" disabled={tx.pending !== null} onClick={payAll}>
                  {tx.pending === `all-${plan.address}`
                    ? t("tx.signing")
                    : plan.mode === "backup"
                      ? t("recover.recoverAll")
                      : t("recover.claimAll")}
                </Button>
              )
            ) : (
              <p className="text-sm font-semibold">
                {t("recover.notYet", { date: formatDate(timeline.recoverableAt, locale) })}
              </p>
            )}
            {recoverable && ready.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("recover.nothingToRecover")}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("recover.feeNote", { fee: formatPercent(RECOVERY_FEE_BPS / 10_000, locale) })}
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

export default Recover;
