import { Link } from "react-router-dom";
import { ArrowRight, TriangleAlert } from "lucide-react";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Cap, Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { PlanSettings } from "@/components/stocks/PlanForms";
import { Cell, EmptyState, List, QueryState, Row, Section } from "@/components/stocks/Section";
import { HealthText, PlanClock, RiskTags } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { useNow, useOwnerOverview } from "@/hooks/useStocks";
import { useStocksTx } from "@/hooks/useStocksTx";
import {
  buildCheckInIx,
  buildClosePlanIx,
  buildReapproveIxs,
  buildUncoverAssetIx,
  buildUpdatePlanIx,
  type PlanMode,
} from "@/lib/stocks";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { canReapprove } from "@/services/coverage";
import { multiplierState } from "@/services/dividends";
import type { CatalogEntry } from "@/services/catalog";
import type { MintDetails } from "@/services/mints";
import type { CoveredRow, OwnerOverview, PlanOverview } from "@/services/overview";
import { riskFlags } from "@/services/risk";

const HEALTH_COLS = "minmax(0,1.3fr) minmax(0,2fr) minmax(7rem,auto)";
const DIVIDEND_COLS = "minmax(0,1.3fr) minmax(0,2fr)";
const RISK_COLS = "minmax(0,1.5fr) minmax(0,0.8fr) minmax(0,2fr)";

const Dashboard = () => (
  <StocksPage page="dashboard">
    {(wallet) => (wallet ? <DashboardBody wallet={wallet} /> : <PreviewDashboard />)}
  </StocksPage>
);

/**
 * The dashboard before a wallet is connected: one card with the two ways in,
 * the same one a connected wallet with no plans sees. Its sections only mean
 * something once there is a plan to watch, so they wait.
 */
function PreviewDashboard() {
  const { t } = useTranslation("stocks");
  return (
    <EmptyState title={t("dashboard.noPlanTitle")} description={t("dashboard.previewDescription")}>
      <Button variant="primary" asChild>
        <Link to="/protect">{t("dashboard.startBackup")}</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link to="/inherit">{t("dashboard.startVault")}</Link>
      </Button>
    </EmptyState>
  );
}

function DashboardBody({ wallet }: { wallet: WalletCtx }) {
  const overview = useOwnerOverview(wallet.address);
  return (
    <QueryState query={overview}>
      {(data) => <DashboardView wallet={wallet} data={data} />}
    </QueryState>
  );
}

function DashboardView({ wallet, data }: { wallet: WalletCtx; data: OwnerOverview }) {
  const { t } = useTranslation("stocks");
  const tx = useStocksTx(wallet.signer);
  const now = useNow();

  if (!data.backup && !data.vault) {
    return (
      <EmptyState title={t("dashboard.noPlanTitle")} description={t("dashboard.noPlanDescription")}>
        <Button variant="primary" asChild>
          <Link to="/protect">{t("dashboard.startBackup")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/inherit">{t("dashboard.startVault")}</Link>
        </Button>
      </EmptyState>
    );
  }

  const checkIn = (mode: PlanMode) =>
    tx.run(`checkin-${mode}`, {
      done: "checkIn",
      build: async () => [[await buildCheckInIx(wallet.signer, { owner: wallet.address, mode })]],
    });

  // The backup reads as the everyday card; the vault carries the sage that
  // marks what is being kept for someone.
  const planPanel = (mode: PlanMode, overview: PlanOverview) => (
    <Panel tone={mode === "backup" ? "soft" : "sage"} className="gap-7">
      <Cap>{mode === "backup" ? t("dashboard.backupTitle") : t("dashboard.vaultTitle")}</Cap>
      <PlanClock plan={overview.plan} now={now} />
      <div className="mt-auto flex flex-wrap gap-2.5">
        <Button variant="ink" disabled={tx.pending !== null} onClick={() => checkIn(mode)}>
          {tx.pending === `checkin-${mode}` ? t("tx.signing") : t("common.checkIn")}
        </Button>
        {mode === "vault" && (
          <Button variant="ghost" asChild>
            <Link to="/inherit">{t("dashboard.manageVault")}</Link>
          </Button>
        )}
      </div>
    </Panel>
  );

  const evicted = data.backup?.rows.filter((r) => r.health === "evicted") ?? [];

  return (
    <div className="space-y-14">
      {evicted.length > 0 && (
        <Panel tone="alert" className="flex-row gap-4">
          <TriangleAlert className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="hs-h4">{t("dashboard.alertTitle", { count: evicted.length })}</h2>
            <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-foreground/75">
              {t("dashboard.alertDescription")}
            </p>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.backup ? planPanel("backup", data.backup) : <Offer mode="backup" />}
        {data.vault ? planPanel("vault", data.vault) : <Offer mode="vault" />}
      </div>

      {data.backup && (
        <Section title={t("dashboard.healthTitle")}>
          {data.backup.rows.length === 0 ? (
            <p className="hs-sheet px-5 py-4 text-sm text-muted-foreground">
              {t("dashboard.healthEmpty")}
            </p>
          ) : (
            <List
              cols={HEALTH_COLS}
              head={[t("columns.stock"), t("columns.status"), ""]}
            >
              {data.backup.rows.map((row) => (
                <HealthRow key={row.record.address} row={row} wallet={wallet} tx={tx} />
              ))}
            </List>
          )}
        </Section>
      )}

      <Dividends data={data} now={now} />
      <IssuerRisk data={data} />

      {data.backup && (
        <PlanSettings
          plan={data.backup.plan}
          pending={tx.pending}
          onSave={(changes) =>
            tx.run("settings", {
              done: "settings",
              build: async () => [[await buildUpdatePlanIx(wallet.signer, "backup", changes)]],
            })
          }
          onClose={() =>
            tx.run("close", {
              done: "closePlan",
              build: async () => [[await buildClosePlanIx(wallet.signer, "backup")]],
            })
          }
        />
      )}
    </div>
  );
}

/** The plan this wallet doesn't have yet, offered in the other half of the row. */
function Offer({ mode }: { mode: PlanMode }) {
  const { t } = useTranslation("stocks");
  const page = mode === "backup" ? "protect" : "inherit";
  return (
    <Panel tone="paper" className="justify-between gap-8">
      <div>
        <h2 className="hs-h4">{t(`pages.${page}.headline`)}</h2>
        <p className="mt-2 max-w-[28rem] text-[0.9375rem] leading-relaxed text-muted-foreground">
          {t(`pages.${page}.description`)}
        </p>
      </div>
      <div>
        <Button variant="ghost" asChild>
          <Link to={`/${page}`}>
            {mode === "backup" ? t("dashboard.startBackup") : t("dashboard.startVault")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

function HealthRow({
  row,
  wallet,
  tx,
}: {
  row: CoveredRow;
  wallet: WalletCtx;
  tx: ReturnType<typeof useStocksTx>;
}) {
  const { t } = useTranslation("stocks");
  const id = `health-${row.record.mint}`;

  let action = null;
  if (canReapprove(row.health, row.mint) && row.mint.mintAuthority) {
    const mintAuthority = row.mint.mintAuthority;
    action = (
      <Button
        variant="primary"
        size="sm"
        disabled={tx.pending !== null}
        onClick={() =>
          tx.run(id, {
            done: "reapprove",
            build: async () => [
              await buildReapproveIxs(
                wallet.signer,
                { ...row.mint, mintAuthority },
                {
                  sourceTokenAccount: row.record.sourceTokenAccount,
                  allocationBps: row.record.allocationBps,
                },
              ),
            ],
          })
        }
      >
        {tx.pending === id ? t("tx.signing") : t("dashboard.reapprove")}
      </Button>
    );
  } else if (row.health === "closed") {
    action = (
      <Button
        variant="ghost"
        size="sm"
        disabled={tx.pending !== null}
        onClick={() =>
          tx.run(id, {
            done: "removeRecord",
            build: async () => [[await buildUncoverAssetIx(wallet.signer, row.mint, null)]],
          })
        }
      >
        {tx.pending === id ? t("tx.signing") : t("dashboard.removeRecord")}
      </Button>
    );
  }

  return (
    <Row className={row.health === "covered" ? undefined : "bg-accent-yellow/[0.07]"}>
      <AssetBadge mint={row.mint} catalog={row.catalog} />
      <Cell label={t("columns.status")}>
        <HealthText health={row.health} withHint />
      </Cell>
      <div className="md:justify-self-end">{action}</div>
    </Row>
  );
}

interface DisplayedMint {
  mint: MintDetails;
  catalog: CatalogEntry | null;
}

/** Every stock the owner holds or has vaulted, once each. */
function ownedMints(data: OwnerOverview): DisplayedMint[] {
  const seen = new Map<Address, DisplayedMint>();
  for (const h of data.holdings) {
    if (h.position.amount > 0n) seen.set(h.mint.mint, { mint: h.mint, catalog: h.catalog });
  }
  for (const row of data.vault?.rows ?? []) {
    if (!seen.has(row.mint.mint)) seen.set(row.mint.mint, { mint: row.mint, catalog: row.catalog });
  }
  return [...seen.values()];
}

function Dividends({ data, now }: { data: OwnerOverview; now: number }) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const upcoming = ownedMints(data)
    .map((m) => ({ ...m, state: multiplierState(m.mint, now) }))
    .filter((m) => m.state?.upcoming)
    .sort((a, b) => a.state!.upcoming!.effectiveAt - b.state!.upcoming!.effectiveAt);

  return (
    <Section
      title={t("dashboard.dividendsTitle")}
      description={t("dashboard.dividendsDescription")}
    >
      {upcoming.length === 0 ? (
        <p className="hs-sheet px-5 py-4 text-sm text-muted-foreground">
          {t("dashboard.dividendsEmpty")}
        </p>
      ) : (
        <List
          cols={DIVIDEND_COLS}
          head={[t("columns.stock"), t("columns.change")]}
        >
          {upcoming.map(({ mint, catalog, state }) => (
            <Row key={mint.mint}>
              <AssetBadge mint={mint} catalog={catalog} />
              <Cell label={t("columns.change")}>
                <p className="font-medium">
                  {t("dashboard.dividendRow", {
                    change: formatPercent(state!.upcoming!.change, locale, true),
                    date: formatDate(state!.upcoming!.effectiveAt, locale),
                  })}
                </p>
                <p className="hs-mono-xs mt-1 text-muted-foreground">
                  {t("dashboard.currentMultiplier", {
                    value: formatNumber(state!.current, locale, 6),
                  })}
                </p>
              </Cell>
            </Row>
          ))}
        </List>
      )}
    </Section>
  );
}

function IssuerRisk({ data }: { data: OwnerOverview }) {
  const { t } = useTranslation("stocks");
  const issuers = new Map(data.holdings.map((h) => [h.mint.mint, h.issuer] as const));
  const mints = ownedMints(data);
  if (mints.length === 0) return null;

  return (
    <Section title={t("dashboard.riskTitle")} description={t("risk.legend")}>
      <List
        cols={RISK_COLS}
        head={[t("columns.stock"), t("columns.tier"), t("columns.issuerCan")]}
      >
        {mints.map(({ mint, catalog }) => {
          const issuer = issuers.get(mint.mint);
          return (
            <Row key={mint.mint}>
              <AssetBadge mint={mint} catalog={catalog} issuer={issuer ?? null} />
              <Cell label={t("columns.tier")}>
                <span className="hs-chip">
                  {issuer
                    ? t("common.issuerTier", { tier: issuer.riskTier })
                    : t("common.unknownIssuer")}
                </span>
              </Cell>
              <Cell label={t("columns.issuerCan")}>
                {riskFlags(mint).length > 0 ? (
                  <RiskTags mint={mint} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("dashboard.riskNone")}</p>
                )}
              </Cell>
            </Row>
          );
        })}
      </List>
    </Section>
  );
}

export default Dashboard;
