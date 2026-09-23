import { Link } from "react-router-dom";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { PlanSettings } from "@/components/stocks/PlanForms";
import { EmptyState, QueryState, Section } from "@/components/stocks/Section";
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

const Dashboard = () => (
  <StocksPage page="dashboard">{(wallet) => <DashboardBody wallet={wallet} />}</StocksPage>
);

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
        <Button variant="flat-yellow" asChild>
          <Link to="/protect">{t("dashboard.startBackup")}</Link>
        </Button>
        <Button variant="flat-outline" asChild>
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

  const planPanel = (mode: PlanMode, overview: PlanOverview) => (
    <Panel tone={mode === "backup" ? "paper" : "sage"} className="gap-4">
      <PanelCap className="text-muted-foreground">
        {mode === "backup" ? t("dashboard.backupTitle") : t("dashboard.vaultTitle")}
      </PanelCap>
      <PlanClock plan={overview.plan} now={now} />
      <div className="mt-auto flex flex-wrap gap-3">
        <Button variant="flat" disabled={tx.pending !== null} onClick={() => checkIn(mode)}>
          {tx.pending === `checkin-${mode}` ? t("tx.signing") : t("common.checkIn")}
        </Button>
        {mode === "vault" && (
          <Button variant="flat-outline" asChild>
            <Link to="/inherit">{t("dashboard.manageVault")}</Link>
          </Button>
        )}
      </div>
    </Panel>
  );

  const evicted = data.backup?.rows.filter((r) => r.health === "evicted") ?? [];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 lg:grid-cols-2">
        {data.backup && planPanel("backup", data.backup)}
        {data.vault && planPanel("vault", data.vault)}
      </div>

      {evicted.length > 0 && (
        <Panel tone="yellow" className="gap-4">
          <h2 className="ed-h3">{t("dashboard.alertTitle", { count: evicted.length })}</h2>
          <p className="max-w-2xl text-foreground/75">{t("dashboard.alertDescription")}</p>
        </Panel>
      )}

      {data.backup && (
        <Section title={t("dashboard.healthTitle")}>
          {data.backup.rows.length === 0 ? (
            <p className="text-muted-foreground">{t("dashboard.healthEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {data.backup.rows.map((row) => (
                <HealthRow key={row.record.address} row={row} wallet={wallet} tx={tx} />
              ))}
            </ul>
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
        variant="flat-yellow"
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
        variant="flat-outline"
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
    <li>
      <Panel
        tone={row.health === "covered" ? "paper" : "yellow-line"}
        className="gap-4 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_auto] md:items-center"
      >
        <AssetBadge mint={row.mint} catalog={row.catalog} />
        <HealthText health={row.health} withHint />
        <div className="md:justify-self-end">{action}</div>
      </Panel>
    </li>
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
        <p className="text-muted-foreground">{t("dashboard.dividendsEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map(({ mint, catalog, state }) => (
            <li key={mint.mint}>
              <Panel
                tone="sky"
                className="gap-3 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)] md:items-center"
              >
                <AssetBadge mint={mint} catalog={catalog} />
                <div>
                  <p className="font-semibold">
                    {t("dashboard.dividendRow", {
                      change: formatPercent(state!.upcoming!.change, locale, true),
                      date: formatDate(state!.upcoming!.effectiveAt, locale),
                    })}
                  </p>
                  <p className="text-sm text-foreground/65">
                    {t("dashboard.currentMultiplier", {
                      value: formatNumber(state!.current, locale, 6),
                    })}
                  </p>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
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
      <ul className="space-y-3">
        {mints.map(({ mint, catalog }) => {
          const issuer = issuers.get(mint.mint);
          return (
            <li key={mint.mint}>
              <Panel
                tone="paper"
                className="gap-3 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,2fr)] md:items-center"
              >
                <AssetBadge mint={mint} catalog={catalog} issuer={issuer ?? null} />
                <p className="text-sm font-semibold">
                  {issuer
                    ? t("common.issuerTier", { tier: issuer.riskTier })
                    : t("common.unknownIssuer")}
                </p>
                {riskFlags(mint).length > 0 ? (
                  <RiskTags mint={mint} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("dashboard.riskNone")}</p>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export default Dashboard;
