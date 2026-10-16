import { useState } from "react";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { Button } from "@/components/ui/button";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ExplorerLink } from "@/components/portal/EstateGlance";
import { EstateLookupDetails, EstateLookupForm } from "@/components/portal/EstateLookup";
import {
  CardRow,
  CountdownBar,
  RoleEstateCard,
  StatusPill,
} from "@/components/portal/RoleEstateCard";
import {
  ConnectPanel,
  EmptyScanPanel,
  ScanFailedPanel,
  ScanningPanel,
  ScanSummary,
} from "@/components/portal/ScanStates";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useToast } from "@/hooks/useToast";
import { useEstateScan } from "@/hooks/useEstateScan";
import { useLiveEstate } from "@/hooks/useLiveEstate";
import { delegateDefer, lookupNamedEstateSnapshot, type EstateSnapshot } from "@/services/heirloom";
import {
  errMsg,
  formatCountdown,
  formatDuration,
  formatTimeAgo,
  truncateAddress,
} from "@/lib/utils";

const GuardianCard: React.FC<{
  estate: EstateSnapshot;
  pausing: boolean;
  txId?: string;
  onPause: () => void;
}> = ({ estate, pausing, txId, onPause }) => {
  const { t, i18n } = useTranslation("app");
  const live = useLiveEstate(estate);

  const title =
    estate.label ?? t("roles.estateOf", { owner: truncateAddress(estate.authority, 4) });
  const sub = t("roles.heir", { address: truncateAddress(estate.heir, 4) });
  const opensIn = (
    <>
      <CardRow label={t("roles.opensIn")} value={formatCountdown(live.secondsUntilClaimable)} />
      <CountdownBar progress={live.progress} overdue />
    </>
  );
  const pauseButton = (enabled: boolean) => (
    <Button
      variant="flat-yellow"
      onClick={onPause}
      disabled={!enabled || pausing}
      className="w-full sm:w-auto"
    >
      {pausing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {t("guardian.pausing")}
        </>
      ) : (
        t("guardian.pause")
      )}
    </Button>
  );
  const note = (text: string) => (
    <>
      <p>{text}</p>
      {txId && (
        <div className="mt-2">
          <ExplorerLink txId={txId}>{t("roles.viewTx")}</ExplorerLink>
        </div>
      )}
    </>
  );

  if (live.state === "distributed" || live.state === "claimable") {
    const claimed = live.state === "distributed";
    return (
      <RoleEstateCard
        title={title}
        sub={sub}
        pill={
          <StatusPill tone="neutral">
            {claimed ? t("roles.pillClaimed") : t("roles.pillOpen")}
          </StatusPill>
        }
        note={note(claimed ? t("roles.claimedNote") : t("roles.openNote"))}
      />
    );
  }

  // The pause is one-shot until the owner's next check-in clears it, so a used pause shows
  // as paused for as long as it is still holding the estate closed.
  if (live.pauseRunning || (live.state === "grace" && estate.isDeferred)) {
    return (
      <RoleEstateCard
        title={title}
        sub={sub}
        pill={
          live.pauseRunning ? (
            <StatusPill tone="neutral">{t("guardian.pillPaused")}</StatusPill>
          ) : (
            <StatusPill tone="warning">{t("guardian.pillMissed")}</StatusPill>
          )
        }
        note={note(t("guardian.pausedNote", { time: formatCountdown(live.secondsUntilClaimable) }))}
      >
        {opensIn}
      </RoleEstateCard>
    );
  }

  if (live.state === "grace") {
    return (
      <RoleEstateCard
        title={title}
        sub={sub}
        pill={<StatusPill tone="warning">{t("guardian.pillMissed")}</StatusPill>}
        note={note(
          t("guardian.missedNote", {
            duration: formatDuration(estate.delegatePauseDurationSecs, { long: true }),
          }),
        )}
        action={pauseButton(true)}
      >
        {opensIn}
      </RoleEstateCard>
    );
  }

  // On track. The program would take a pause now too, but it would only spend the one pause
  // the owner has, so the button waits for a missed check-in.
  return (
    <RoleEstateCard
      title={title}
      sub={sub}
      pill={<StatusPill tone="ok">{t("guardian.pillActive")}</StatusPill>}
      note={note(t("guardian.activeNote"))}
      action={pauseButton(false)}
    >
      <CardRow
        label={t("guardian.ownerCheckedIn")}
        value={formatTimeAgo(
          estate.lastCheckInTs > 0 ? estate.lastCheckInTs : estate.createdAt,
          i18n.language,
          live.nowMs,
        )}
      />
    </RoleEstateCard>
  );
};

const GuardianPageInner: React.FC<{
  signer: TransactionSigner | null;
  wallet: Address | null;
}> = ({ signer, wallet }) => {
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const scan = useEstateScan("guardian", wallet);

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState<EstateSnapshot | null>(null);
  const [pausingKey, setPausingKey] = useState<string | null>(null);
  const [txIds, setTxIds] = useState<Record<string, string>>({});

  const keyOf = (e: EstateSnapshot) => `${e.authority}:${e.heir}`;

  const handleLookup = async (owner: string, heir: string) => {
    const found = await lookupNamedEstateSnapshot(scan.client, owner, heir);
    if (!found) return t("roles.notFoundError");
    if (found.delegate !== wallet) return t("guardian.notGuardianError");
    scan.add(found);
    return null;
  };

  const performPause = async () => {
    const estate = confirming;
    if (!estate || !signer) return;
    const key = keyOf(estate);
    setPausingKey(key);
    try {
      const tx = await delegateDefer(scan.client, signer, {
        authority: toAddress(estate.authority),
        heir: toAddress(estate.heir),
      });
      setTxIds((p) => ({ ...p, [key]: tx }));
      setConfirming(null);
      track("defer_succeeded");
      toast({ title: t("guardian.toastPausedTitle"), description: t("guardian.toastPausedDesc") });
      const updated = await lookupNamedEstateSnapshot(scan.client, estate.authority, estate.heir);
      if (updated) scan.add(updated);
    } catch (err: unknown) {
      track("defer_failed", { stage: "transaction" });
      toast({
        title: t("guardian.toastFailTitle"),
        description: errMsg(err, t("guardian.rejected")),
        variant: "destructive",
      });
    } finally {
      setPausingKey(null);
    }
  };

  const empty = scan.done && scan.estates.length === 0;
  const switchWallet = (
    <Button variant="flat-outline" onClick={() => setWalletDialogOpen(true)}>
      {t("roles.switchWallet")}
    </Button>
  );

  return (
    <>
      <PortalLayout
        cap={t("guardian.cap")}
        headline={t("guardian.headline")}
        description={t("guardian.description")}
        onConnectWallet={() => setWalletDialogOpen(true)}
      >
        {!wallet ? (
          <ConnectPanel
            title={t("roles.connectTitle")}
            description={t("guardian.connectDesc")}
            onConnect={() => setWalletDialogOpen(true)}
          />
        ) : (
          <>
            {scan.scanning && <ScanningPanel label={t("guardian.scanning")} />}

            {scan.failed && (
              <ScanFailedPanel
                title={t("roles.scanFailedTitle")}
                description={t("roles.scanFailedDesc")}
                onRetry={() => scan.refetch()}
              />
            )}

            {empty && !scan.failed && (
              <EmptyScanPanel
                checkedWallet={t("roles.checkedWallet", { address: truncateAddress(wallet, 4) })}
                title={t("guardian.emptyTitle")}
                description={t("guardian.emptyDesc")}
              >
                <div className="mt-5">{switchWallet}</div>
              </EmptyScanPanel>
            )}

            {scan.estates.length > 0 && (
              <ScanSummary title={t("guardian.summary", { count: scan.estates.length })}>
                <span className="font-mono text-sm text-muted-foreground">
                  {t("roles.wallet", { address: truncateAddress(wallet, 4) })}
                </span>
              </ScanSummary>
            )}

            {scan.estates.map((estate) => (
              <GuardianCard
                key={keyOf(estate)}
                estate={estate}
                pausing={pausingKey === keyOf(estate)}
                txId={txIds[keyOf(estate)]}
                onPause={() => setConfirming(estate)}
              />
            ))}

            {scan.done && (
              <EstateLookupDetails summary={t("roles.lookUpSummary")} defaultOpen={empty}>
                <EstateLookupForm idPrefix="guardian" withHeir onLookup={handleLookup} />
              </EstateLookupDetails>
            )}
          </>
        )}
      </PortalLayout>

      <ConfirmDialog
        open={confirming !== null}
        title={t("guardian.confirmTitle")}
        description={
          confirming
            ? t("guardian.confirmDesc", {
                duration: formatDuration(confirming.delegatePauseDurationSecs, { long: true }),
              })
            : undefined
        }
        confirmLabel={t("guardian.confirmLabel")}
        cancelLabel={t("guardian.cancelLabel")}
        variant="default"
        loading={pausingKey !== null}
        cap={t("guardian.title")}
        onConfirm={performPause}
        onCancel={() => {
          if (pausingKey === null) setConfirming(null);
        }}
      />

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

const GuardianPage = () => (
  <WithWallet>
    {(ctx) => (
      <GuardianPageInner
        key={ctx?.addressStr ?? "disconnected"}
        signer={ctx?.signer ?? null}
        wallet={ctx?.address ?? null}
      />
    )}
  </WithWallet>
);

export default GuardianPage;
