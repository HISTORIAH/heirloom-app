import { useState } from "react";
import { Link } from "react-router-dom";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { PlanForm } from "@/components/stocks/PlanForms";
import { QueryState, Section } from "@/components/stocks/Section";
import { HealthText, RiskTags } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { useNow, useOwnerOverview } from "@/hooks/useStocks";
import { useStocksTx } from "@/hooks/useStocksTx";
import { buildCoverAssetIx, buildInitializePlanIx, buildUncoverAssetIx } from "@/lib/stocks";
import { formatPercent, formatUiAmount, SECONDS_PER_DAY, truncateAddress } from "@/lib/format";
import { coverBlockers, type StockHolding } from "@/services/holdings";
import type { OwnerOverview, PlanOverview } from "@/services/overview";

/** Cover instructions per transaction; each is an approval plus a new record. */
const COVERS_PER_TX = 3;

const Protect = () => (
  <StocksPage page="protect">{(wallet) => <ProtectBody wallet={wallet} />}</StocksPage>
);

function ProtectBody({ wallet }: { wallet: WalletCtx }) {
  const overview = useOwnerOverview(wallet.address);
  const tx = useStocksTx(wallet.signer);

  return (
    <QueryState query={overview}>
      {(data) =>
        data.backup ? (
          <CoverView wallet={wallet} data={data} backup={data.backup} tx={tx} />
        ) : (
          <PlanForm
            mode="backup"
            owner={wallet.address}
            pending={tx.pending === "create"}
            onSubmit={(input) =>
              tx.run("create", {
                done: "createBackup",
                build: async () => [[await buildInitializePlanIx(wallet.signer, "backup", input)]],
              })
            }
          />
        )
      }
    </QueryState>
  );
}

function PlanTerms({ backup }: { backup: PlanOverview }) {
  const { t } = useTranslation("stocks");
  const { plan } = backup;
  const days = (seconds: number) =>
    t("common.days", { count: Math.round(seconds / SECONDS_PER_DAY) });
  const rows: [string, string][] = [
    [t("common.recoveryWallet"), truncateAddress(plan.destination, 6)],
    [t("planForm.interval"), days(plan.checkinIntervalSecs)],
    [t("planForm.grace"), days(plan.gracePeriodSecs)],
    [t("common.guardian"), plan.guardian ? truncateAddress(plan.guardian, 6) : t("common.none")],
    [
      t("common.checkinWallet"),
      plan.checkinSigner ? truncateAddress(plan.checkinSigner, 6) : t("common.none"),
    ],
  ];

  return (
    <Panel tone="soft" className="gap-4">
      <PanelCap className="text-muted-foreground">{t("protect.planTitle")}</PanelCap>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-mono text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <Link to="/dashboard" className="self-start text-sm font-semibold underline">
        {t("protect.settingsLink")}
      </Link>
    </Panel>
  );
}

function CoverView({
  wallet,
  data,
  backup,
  tx,
}: {
  wallet: WalletCtx;
  data: OwnerOverview;
  backup: PlanOverview;
  tx: ReturnType<typeof useStocksTx>;
}) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();

  const coveredMints = new Set<Address>(backup.rows.map((r) => r.record.mint));
  const candidates = data.holdings.filter(
    (h) => h.position.amount > 0n && !coveredMints.has(h.mint.mint),
  );
  // One record per mint and plan, so only one account of a mint can be covered.
  const seen = new Set<Address>();
  const uncovered = candidates.filter((h) => !seen.has(h.mint.mint) && !!seen.add(h.mint.mint));

  const [selected, setSelected] = useState<Record<string, string>>({});
  const chosen = uncovered.filter((h) => selected[h.position.tokenAccount] !== undefined);

  const cover = () =>
    tx
      .run("cover", {
        done: "cover",
        build: async () => {
          const instructions = await Promise.all(
            chosen.map((h) => {
              const percent = Number(selected[h.position.tokenAccount]);
              const bps = Math.round(Math.min(100, Math.max(1, percent || 100)) * 100);
              return buildCoverAssetIx(
                wallet.signer,
                { ...h.mint, mintAuthority: h.mint.mintAuthority! },
                bps,
                h.position.tokenAccount,
              );
            }),
          );
          const batches = [];
          for (let i = 0; i < instructions.length; i += COVERS_PER_TX) {
            batches.push(instructions.slice(i, i + COVERS_PER_TX));
          }
          return batches;
        },
      })
      .then((ok) => ok && setSelected({}));

  return (
    <div className="space-y-10">
      <PlanTerms backup={backup} />

      <Section
        title={t("protect.chooseTitle")}
        description={t("protect.chooseDescription")}
        action={
          uncovered.length > 0 && (
            <Button
              variant="flat-yellow"
              disabled={chosen.length === 0 || tx.pending !== null}
              onClick={cover}
            >
              {tx.pending === "cover"
                ? t("tx.signing")
                : chosen.length === 0
                  ? t("protect.coverNone")
                  : t("protect.cover", { count: chosen.length })}
            </Button>
          )
        }
      >
        {uncovered.length === 0 ? (
          <p className="text-muted-foreground">{t("protect.nothingToCover")}</p>
        ) : (
          <ul className="space-y-3">
            {uncovered.map((holding) => (
              <UncoveredRow
                key={holding.position.tokenAccount}
                holding={holding}
                amount={formatUiAmount(holding.position.amount, holding.mint, now, locale)}
                allocation={selected[holding.position.tokenAccount]}
                onToggle={(on) =>
                  setSelected((s) => {
                    const next = { ...s };
                    if (on) next[holding.position.tokenAccount] = "100";
                    else delete next[holding.position.tokenAccount];
                    return next;
                  })
                }
                onAllocation={(value) =>
                  setSelected((s) => ({ ...s, [holding.position.tokenAccount]: value }))
                }
              />
            ))}
          </ul>
        )}
      </Section>

      {backup.rows.length > 0 && (
        <Section title={t("protect.coveredTitle")}>
          <ul className="space-y-3">
            {backup.rows.map((row) => (
              <li key={row.record.address}>
                <Panel
                  tone="paper"
                  className="gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
                >
                  <AssetBadge mint={row.mint} catalog={row.catalog} />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.allocation")}</p>
                    <p className="font-semibold">
                      {formatPercent(row.record.allocationBps / 10_000, locale)}
                    </p>
                  </div>
                  <HealthText health={row.health} />
                  <Button
                    variant="flat-outline"
                    size="sm"
                    disabled={tx.pending !== null}
                    onClick={() =>
                      tx.run(`uncover-${row.record.mint}`, {
                        done: "uncover",
                        build: async () => [
                          [
                            await buildUncoverAssetIx(
                              wallet.signer,
                              row.mint,
                              row.position ? row.record.sourceTokenAccount : null,
                            ),
                          ],
                        ],
                      })
                    }
                  >
                    {tx.pending === `uncover-${row.record.mint}`
                      ? t("tx.signing")
                      : t("protect.stopCovering")}
                  </Button>
                </Panel>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {backup.missing > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("protect.missing", { count: backup.missing })}
        </p>
      )}
    </div>
  );
}

function UncoveredRow({
  holding,
  amount,
  allocation,
  onToggle,
  onAllocation,
}: {
  holding: StockHolding;
  amount: string;
  allocation: string | undefined;
  onToggle: (on: boolean) => void;
  onAllocation: (value: string) => void;
}) {
  const { t } = useTranslation("stocks");
  const blockers = coverBlockers(holding);
  const id = `cover-${holding.position.tokenAccount}`;
  const checked = allocation !== undefined;

  return (
    <li>
      <Panel
        tone={checked ? "yellow-line" : "paper"}
        className="gap-4 md:grid md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)] md:items-center"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={blockers.length > 0}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 accent-foreground"
          aria-label={holding.mint.symbol ?? holding.mint.mint}
        />
        <label htmlFor={id} className="cursor-pointer">
          <AssetBadge mint={holding.mint} catalog={holding.catalog} issuer={holding.issuer} />
        </label>
        <p className="font-semibold tabular-nums">{amount}</p>
        {blockers.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t(`blockers.${blockers[0]}`)}</p>
        ) : checked ? (
          <div className="flex items-center gap-2">
            <label htmlFor={`${id}-allocation`} className="text-sm text-muted-foreground">
              {t("common.allocation")}
            </label>
            <input
              id={`${id}-allocation`}
              inputMode="numeric"
              value={allocation}
              onChange={(e) => onAllocation(e.target.value)}
              title={t("protect.allocationHint")}
              className="ed-input w-20"
            />
            <span className="text-sm font-semibold">%</span>
          </div>
        ) : (
          <RiskTags mint={holding.mint} />
        )}
      </Panel>
    </li>
  );
}

export default Protect;
