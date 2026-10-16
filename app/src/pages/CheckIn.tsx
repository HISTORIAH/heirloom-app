import { useState } from "react";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { Button } from "@/components/ui/button";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
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
import { checkInAll, lookupNamedEstateSnapshot, type EstateSnapshot } from "@/services/heirloom";
import { SECONDS_PER_DAY } from "@/lib/constants";
import {
  errMsg,
  formatCountdown,
  formatDuration,
  formatTimeAgo,
  truncateAddress,
} from "@/lib/utils";

const CheckInCard: React.FC<{
  estate: EstateSnapshot;
  busy: boolean;
  checkingIn: boolean;
  txId?: string;
  onCheckIn: () => void;
}> = ({ estate, busy, checkingIn, txId, onCheckIn }) => {
  const { t, i18n } = useTranslation("app");
  const live = useLiveEstate(estate);

  const title =
    estate.label ?? t("roles.estateOf", { owner: truncateAddress(estate.authority, 4) });
  const sub = t("roles.ownerAndHeir", {
    owner: truncateAddress(estate.authority, 4),
    heir: truncateAddress(estate.heir, 4),
  });
  const checkInButton = (primary: boolean) => (
    <Button
      variant={primary ? "flat-yellow" : "flat-outline"}
      onClick={onCheckIn}
      disabled={busy}
      className="w-full sm:w-auto"
    >
      {checkingIn ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {t("checkIn.checkingIn")}
        </>
      ) : (
        t("checkIn.checkIn")
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

  if (live.state === "distributed") {
    return (
      <RoleEstateCard
        title={title}
        sub={sub}
        pill={<StatusPill tone="neutral">{t("roles.pillClaimed")}</StatusPill>}
        note={note(t("roles.claimedNote"))}
      />
    );
  }

  // The program still takes a check-in once the estate has opened, and it closes it again
  // until the heir claims. Say so rather than hide the button.
  if (live.state === "claimable") {
    return (
      <RoleEstateCard
        title={title}
        sub={sub}
        pill={<StatusPill tone="warning">{t("roles.pillOpen")}</StatusPill>}
        note={note(t("checkIn.openNote"))}
        action={checkInButton(true)}
      />
    );
  }

  if (live.state === "grace") {
    const days = Math.floor(live.secondsOverdue / SECONDS_PER_DAY);
    return (
      <RoleEstateCard
        title={title}
        sub={sub}
        pill={
          <StatusPill tone="warning">
            {days > 0 ? t("checkIn.pillOverdueDays", { count: days }) : t("checkIn.pillOverdue")}
          </StatusPill>
        }
        note={note(
          t("checkIn.overdueNote", {
            interval: formatDuration(estate.checkInIntervalSecs, { long: true }),
          }),
        )}
        action={checkInButton(true)}
      >
        <CardRow
          label={t("checkIn.graceEndsIn")}
          value={formatCountdown(live.secondsUntilClaimable)}
        />
        <CountdownBar progress={live.progress} overdue />
      </RoleEstateCard>
    );
  }

  return (
    <RoleEstateCard
      title={title}
      sub={sub}
      pill={<StatusPill tone="ok">{t("checkIn.pillOnTrack")}</StatusPill>}
      note={note(
        t("checkIn.lastCheckIn", {
          time: formatTimeAgo(
            estate.lastCheckInTs > 0 ? estate.lastCheckInTs : estate.createdAt,
            i18n.language,
            live.nowMs,
          ),
        }),
      )}
      action={checkInButton(false)}
    >
      <CardRow label={t("checkIn.nextDueIn")} value={formatCountdown(live.secondsUntilGrace)} />
      <CountdownBar progress={live.progress} overdue={false} />
    </RoleEstateCard>
  );
};

const CheckInPageInner: React.FC<{
  signer: TransactionSigner | null;
  wallet: Address | null;
}> = ({ signer, wallet }) => {
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const scan = useEstateScan("checkInSigner", wallet);

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  // Keys of the estates in the transaction being sent: one card, or all of them.
  const [sending, setSending] = useState<string[]>([]);
  const [txIds, setTxIds] = useState<Record<string, string>>({});

  const keyOf = (e: EstateSnapshot) => `${e.authority}:${e.heir}`;
  // A claimed estate has nothing left to keep closed.
  const open = scan.estates.filter((e) => e.vaultState !== "distributed");

  const handleLookup = async (owner: string, heir: string) => {
    const found = await lookupNamedEstateSnapshot(scan.client, owner, heir);
    if (!found) return t("roles.notFoundError");
    if (found.checkInSigner !== wallet) return t("checkIn.notSignerError");
    scan.add(found);
    return null;
  };

  const sendCheckIn = async (estates: EstateSnapshot[]) => {
    if (!signer) {
      setWalletDialogOpen(true);
      return;
    }
    const keys = estates.map(keyOf);
    setSending(keys);
    try {
      const tx = await checkInAll(
        scan.client,
        signer,
        estates.map((e) => ({ authority: toAddress(e.authority), heir: toAddress(e.heir) })),
      );
      setTxIds((p) => ({ ...p, ...Object.fromEntries(keys.map((k) => [k, tx])) }));
      track("heartbeat_succeeded", { source: "heartbeat_signer_page" });
      toast({
        title: t("checkIn.toastSentTitle"),
        description:
          estates.length > 1
            ? t("checkIn.toastAllDesc", { count: estates.length })
            : t("checkIn.toastSentDesc"),
      });
      const updated = await Promise.all(
        estates.map((e) => lookupNamedEstateSnapshot(scan.client, e.authority, e.heir)),
      );
      for (const u of updated) if (u) scan.add(u);
    } catch (err: unknown) {
      track("heartbeat_failed", { source: "heartbeat_signer_page" });
      toast({
        title: t("checkIn.toastFailTitle"),
        description: errMsg(err, t("checkIn.rejected")),
        variant: "destructive",
      });
    } finally {
      setSending([]);
    }
  };

  const empty = scan.done && scan.estates.length === 0;
  const busy = sending.length > 0;

  return (
    <>
      <PortalLayout
        cap={t("checkIn.cap")}
        headline={t("checkIn.headline")}
        description={t("checkIn.description")}
        onConnectWallet={() => setWalletDialogOpen(true)}
      >
        <div data-tour="check-in-scan" className="space-y-5">
          {!wallet ? (
            <ConnectPanel
              title={t("roles.connectTitle")}
              description={t("checkIn.connectDesc")}
              onConnect={() => setWalletDialogOpen(true)}
            />
          ) : (
            <>
              {scan.scanning && <ScanningPanel label={t("checkIn.scanning")} />}

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
                  title={t("checkIn.emptyTitle")}
                  description={t("checkIn.emptyDesc")}
                >
                  <div className="mt-5">
                    <Button variant="flat-outline" onClick={() => setWalletDialogOpen(true)}>
                      {t("roles.switchWallet")}
                    </Button>
                  </div>
                </EmptyScanPanel>
              )}

              {scan.estates.length > 0 && (
                <ScanSummary title={t("checkIn.summary", { count: scan.estates.length })}>
                  {open.length > 1 ? (
                    <Button
                      variant="flat-outline"
                      onClick={() => sendCheckIn(open)}
                      disabled={busy}
                    >
                      {busy && sending.length > 1 ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> {t("checkIn.checkingIn")}
                        </>
                      ) : (
                        t("checkIn.checkInAll")
                      )}
                    </Button>
                  ) : (
                    <span className="font-mono text-sm text-muted-foreground">
                      {t("roles.wallet", { address: truncateAddress(wallet, 4) })}
                    </span>
                  )}
                </ScanSummary>
              )}

              {scan.estates.map((estate) => (
                <CheckInCard
                  key={keyOf(estate)}
                  estate={estate}
                  busy={busy}
                  checkingIn={sending.length === 1 && sending[0] === keyOf(estate)}
                  txId={txIds[keyOf(estate)]}
                  onCheckIn={() => sendCheckIn([estate])}
                />
              ))}

              {scan.done && (
                <EstateLookupDetails summary={t("roles.lookUpSummary")} defaultOpen={empty}>
                  <EstateLookupForm idPrefix="check-in" withHeir onLookup={handleLookup} />
                </EstateLookupDetails>
              )}
            </>
          )}
        </div>
      </PortalLayout>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

const CheckInPage = () => (
  <WithWallet>
    {(ctx) => (
      <CheckInPageInner
        key={ctx?.addressStr ?? "disconnected"}
        signer={ctx?.signer ?? null}
        wallet={ctx?.address ?? null}
      />
    )}
  </WithWallet>
);

export default CheckInPage;
