import { useState } from "react";
import { Link } from "react-router-dom";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Cap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { PlanForm } from "@/components/stocks/PlanForms";
import { Cell, List, Notice, QueryState, Row, Section } from "@/components/stocks/Section";
import { HealthText, RiskTags } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { usePageSession, useResume } from "@/contexts/PageSession";
import { useNow, useOwnerOverview } from "@/hooks/useStocks";
import { useStocksTx } from "@/hooks/useStocksTx";
import { buildCoverAssetIx, buildInitializePlanIx, buildUncoverAssetIx } from "@/lib/stocks";
import { formatDuration, formatPercent, formatUiAmount, truncateAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { coverBlockers, type StockHolding } from "@/services/holdings";
import type { OwnerOverview, PlanOverview } from "@/services/overview";

/** Cover instructions per transaction; each is an approval plus a new record. */
const COVERS_PER_TX = 3;

const CHOOSE_COLS = "minmax(0,2.1fr) minmax(0,0.9fr) minmax(0,1.5fr) minmax(6.5rem,auto)";

/** The pending action a disconnected "Create backup plan" leaves for the connected page. */
const CREATE = "create-backup";

const Protect = () => (
  <StocksPage page="protect">
    {(wallet) => (wallet ? <ConnectedProtect wallet={wallet} /> : <PreviewProtect />)}
  </StocksPage>
);

/**
 * Without a wallet the page is the form a new owner starts from. Submitting
 * it asks for a wallet; the connected page then creates the plan from the
 * same fields, or shows the plan the wallet already has.
 */
function PreviewProtect() {
  const { requireWallet } = usePageSession();
  return (
    <PlanForm mode="backup" owner={null} pending={false} onSubmit={() => requireWallet(CREATE)} />
  );
}

function ConnectedProtect({ wallet }: { wallet: WalletCtx }) {
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
            resumeKey={CREATE}
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
  // Label, value, and whether the value is an address (set in mono).
  const rows: [string, string, boolean][] = [
    [t("common.recoveryWallet"), truncateAddress(plan.destination, 6), true],
    [t("planForm.interval"), formatDuration(plan.checkinIntervalSecs, t), false],
    [t("planForm.grace"), formatDuration(plan.gracePeriodSecs, t), false],
    [
      t("common.guardian"),
      plan.guardian ? truncateAddress(plan.guardian, 6) : t("common.none"),
      !!plan.guardian,
    ],
    [
      t("common.checkinWallet"),
      plan.checkinSigner ? truncateAddress(plan.checkinSigner, 6) : t("common.none"),
      !!plan.checkinSigner,
    ],
  ];

  return (
    <section className="hs-sheet overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
        <Cap>{t("protect.planTitle")}</Cap>
        <Link to="/dashboard" className="hs-link hs-tap text-sm">
          {t("protect.settingsLink")}
        </Link>
      </header>
      {/* Stacked below lg with rules between; one row of five above it. */}
      <dl className="grid grid-cols-1 divide-y divide-tile-line border-t border-tile-line lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        {rows.map(([label, value, mono]) => (
          <div key={label} className="px-5 py-4 md:px-6">
            <dt className="hs-mono-xs text-muted-foreground">{label}</dt>
            <dd className={cn("mt-1.5 truncate font-medium", mono ? "hs-mono" : "text-[0.9375rem]")}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
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
  // Asked to create a plan, but the wallet that connected already has one.
  const alreadyHad = useResume(CREATE, true);

  const coveredMints = new Set<Address>(backup.rows.map((r) => r.record.mint));
  const heldAny = data.holdings.some((h) => h.position.amount > 0n);
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
    <div className="space-y-14">
      {alreadyHad && <Notice>{t("protect.existingPlan")}</Notice>}
      <PlanTerms backup={backup} />

      <Section
        title={t("protect.chooseTitle")}
        description={t("protect.chooseDescription")}
        action={
          uncovered.length > 0 && (
            <Button
              variant="primary"
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
          // Nothing left to cover is two different situations: everything is
          // already covered, or the wallet holds no supported stock at all.
          heldAny ? (
            <p className="hs-sheet px-5 py-4 text-sm text-muted-foreground">
              {t("protect.nothingToCover")}
            </p>
          ) : (
            <div className="hs-sheet flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">{t("protect.nothingHeld")}</p>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/browse">{t("protect.browse")}</Link>
              </Button>
            </div>
          )
        ) : (
          <List
            cols={CHOOSE_COLS}
            head={[t("columns.stock"), t("columns.balance"), t("columns.issuerCan"), t("columns.allocation")]}
          >
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
          </List>
        )}
      </Section>

      {backup.rows.length > 0 && (
        <Section title={t("protect.coveredTitle")}>
          <List
            cols="minmax(0,2fr) minmax(0,0.9fr) minmax(0,1.2fr) minmax(8rem,auto)"
            head={[t("columns.stock"), t("columns.allocation"), t("columns.status"), ""]}
          >
            {backup.rows.map((row) => (
              <Row key={row.record.address}>
                <AssetBadge mint={row.mint} catalog={row.catalog} />
                <Cell label={t("columns.allocation")}>
                  <p className="font-medium tabular-nums">
                    {formatPercent(row.record.allocationBps / 10_000, locale)}
                  </p>
                </Cell>
                <Cell label={t("columns.status")}>
                  <HealthText health={row.health} />
                </Cell>
                <div className="md:justify-self-end">
                  <Button
                    variant="ghost"
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
                </div>
              </Row>
            ))}
          </List>
        </Section>
      )}

      {backup.missing > 0 && (
        <p className="hs-mono-xs text-muted-foreground">
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
    <Row className={cn(checked && "bg-tile-soft/70")}>
      <div className="flex min-w-0 items-center gap-4">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={blockers.length > 0}
          onChange={(e) => onToggle(e.target.checked)}
          className="hs-check"
          aria-label={holding.mint.symbol ?? holding.mint.mint}
        />
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          <AssetBadge mint={holding.mint} catalog={holding.catalog} issuer={holding.issuer} />
        </label>
      </div>
      <Cell label={t("columns.balance")}>
        <p className="font-medium tabular-nums">{amount}</p>
      </Cell>
      <Cell label={t("columns.issuerCan")}>
        {blockers.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t(`blockers.${blockers[0]}`)}</p>
        ) : (
          <RiskTags mint={holding.mint} />
        )}
      </Cell>
      <Cell label={t("columns.allocation")}>
        {checked ? (
          <div className="relative w-24">
            <label htmlFor={`${id}-allocation`} className="sr-only">
              {t("common.allocation")}
            </label>
            <input
              id={`${id}-allocation`}
              inputMode="numeric"
              value={allocation}
              onChange={(e) => onAllocation(e.target.value)}
              title={t("protect.allocationHint")}
              className="hs-input h-10 pr-8 tabular-nums"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            >
              %
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </Cell>
    </Row>
  );
}

export default Protect;
