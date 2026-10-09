import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "@solana/kit";
import { ArrowDown, Check, X } from "lucide-react";
import { Modal } from "@/components/surface/Modal";
import {
  Callout,
  FieldLabel,
  FormButton,
  TxProgress,
  formInput,
} from "@/components/dashboard/modals/parts";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTxFlow } from "@/hooks/useTxFlow";
import { useNow } from "@/hooks/useNow";
import { NETWORK_FEE_LAMPORTS } from "@/lib/constants";
import { cn, formatSol, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  /** The heir's name from the reminders profile, if one is set. */
  heirName: string | null;
  onTx: (id: string) => void;
}

type AddressCheck =
  | { kind: "empty" }
  | { kind: "bad"; key: string }
  | { kind: "checking" }
  | { kind: "warn" }
  | { kind: "ok" };

/** The first and last six characters are what people actually compare, so they stand out. */
const EmphasisedAddress: React.FC<{ value: string }> = ({ value }) => (
  <>
    <b className="rounded-[3px] bg-accent-yellow px-[3px] text-lg">{value.slice(0, 6)}</b>
    {value.slice(6, -6)}
    <b className="rounded-[3px] bg-accent-yellow px-[3px] text-lg">{value.slice(-6)}</b>
  </>
);

const ReassignHeirSection: React.FC<Props> = ({ estate, heirName, onTx }) => {
  const { t, i18n } = useTranslation("app");
  const { updateHeirOnChain } = useVault();
  const { publicKey, rpc } = useWallet();
  const { track } = useAnalytics();
  const tx = useTxFlow();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [address, setAddress] = useState("");
  const [ack, setAck] = useState(false);

  const currentName = heirName ?? t("changeHeir.currentFallback");
  const pauseEnds = estate.delegatePauseExpiresAt * 1000;
  const now = useNow(60_000);
  const paused = pauseEnds > now;

  const valid = isAddress(address);
  const ownWallet = valid && address === publicKey;
  const sameHeir = valid && address === estate.heir;

  // A warning, not a blocker: a fresh wallet is fine, but worth a second look.
  const history = useQuery({
    queryKey: ["address-history", address],
    queryFn: async () => {
      const sigs = await rpc.getSignaturesForAddress(address as Address, { limit: 1 }).send();
      return sigs.length > 0;
    },
    enabled: open && valid && !ownWallet && !sameHeir,
    staleTime: Infinity,
    retry: false,
  });

  const check: AddressCheck = !address
    ? { kind: "empty" }
    : !valid
      ? { kind: "bad", key: "changeHeir.invalid" }
      : ownWallet
        ? { kind: "bad", key: "changeHeir.ownWallet" }
        : sameHeir
          ? { kind: "bad", key: "changeHeir.alreadyHeir" }
          : history.isPending
            ? { kind: "checking" }
            : history.data === false
              ? { kind: "warn" }
              : { kind: "ok" };
  const canReview = check.kind === "ok" || check.kind === "warn";

  const openModal = () => {
    setStep("edit");
    setAddress("");
    setAck(false);
    tx.reset();
    setOpen(true);
  };

  const close = () => {
    if (tx.busy) return;
    setOpen(false);
    // The heir change moves the estate to a new address; refresh only once the success view
    // has been seen, since the refresh remounts this card.
    if (tx.step === "done") void tx.refresh();
  };

  const paste = async () => {
    try {
      setAddress((await navigator.clipboard.readText()).trim());
    } catch {
      // Clipboard permission denied: the field still takes a normal paste.
    }
  };

  const submit = async () => {
    const next = address;
    const sent = await tx.run(
      async () => {
        const id = await updateHeirOnChain(estate.heir, next);
        onTx(id);
        return id;
      },
      { deferRefresh: true },
    );
    track(sent ? "heir_reassigned" : "heir_reassign_failed", sent ? undefined : { stage: "transaction" });
  };

  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" });
  const sol = Number(formatSol(estate.solBalance));
  const assetsMoving = [
    t("changeHeir.solAmount", { amount: sol.toLocaleString(undefined, { maximumFractionDigits: 4 }) }),
    ...(estate.vaultTokens.length
      ? [t("changeHeir.tokenCount", { count: estate.vaultTokens.length })]
      : []),
  ].join(" · ");
  const estateName = estate.label ?? truncateAddress(estate.heir, 4);
  const inTx = tx.step !== "idle";
  const fee = t("addAsset.costTopUp", { amount: formatSol(NETWORK_FEE_LAMPORTS, 6) });

  const header = inTx
    ? { cap: t("tx.cap"), title: t("changeHeir.txTitle"), sub: tx.step === "done" ? undefined : t("tx.keepOpen") }
    : step === "review"
      ? { cap: t("changeHeir.reviewCap"), title: t("changeHeir.reviewTitle"), sub: t("changeHeir.reviewSubtitle") }
      : { cap: t("changeHeir.cap"), title: t("changeHeir.title"), sub: t("changeHeir.subtitle") };

  let footer: React.ReactNode;
  if (inTx) {
    footer =
      tx.step === "done" ? (
        <FormButton onClick={close}>{t("tx.doneButton")}</FormButton>
      ) : tx.step === "error" ? (
        <>
          <FormButton tone="secondary" onClick={close}>
            {t("common.close")}
          </FormButton>
          <FormButton onClick={tx.reset}>{t("tx.tryAgain")}</FormButton>
        </>
      ) : null;
  } else if (paused) {
    footer = <FormButton onClick={close}>{t("common.close")}</FormButton>;
  } else if (step === "edit") {
    footer = (
      <>
        <FormButton tone="secondary" onClick={close}>
          {t("common.cancel")}
        </FormButton>
        <FormButton
          onClick={() => {
            setAck(false);
            setStep("review");
          }}
          disabled={!canReview}
        >
          {canReview
            ? t("changeHeir.review")
            : address
              ? t("changeHeir.fixAddress")
              : t("changeHeir.enterAddress")}
        </FormButton>
      </>
    );
  } else {
    footer = (
      <>
        <FormButton tone="secondary" onClick={() => setStep("edit")}>
          {t("changeHeir.back")}
        </FormButton>
        <FormButton onClick={submit} disabled={!ack}>
          {t("changeHeir.confirm")}
        </FormButton>
      </>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className="w-full rounded-lg border border-tile-line px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft"
      >
        {t("dashboard.manage.changeHeirShort")}
      </button>

      <Modal
        open={open}
        layout="form"
        cap={header.cap}
        title={header.title}
        description={header.sub}
        busy={tx.busy}
        onClose={close}
        cost={inTx ? (tx.busy ? t("tx.backgroundNote") : null) : paused ? null : fee}
        footer={footer}
      >
        {inTx ? (
          <TxProgress
            step={tx.step}
            txId={tx.txId}
            error={tx.error}
            doneTitle={t("changeHeir.doneTitle")}
            doneSummary={t("changeHeir.doneSummary", { estate: estateName })}
          />
        ) : paused ? (
          <Callout tone="danger">
            <strong>{t("changeHeir.pausedTitle")}</strong>
            <br />
            {t("changeHeir.pausedBody", { date: fmtDate(pauseEnds) })}
          </Callout>
        ) : step === "edit" ? (
          <>
            <div>
              <FieldLabel>{t("changeHeir.currentLabel")}</FieldLabel>
              <div className="rounded-xl bg-tile-soft px-4 py-3.5">
                <div className="text-[15px] font-semibold">{currentName}</div>
                <div className="font-mono text-[13px] text-muted-foreground">
                  {truncateAddress(estate.heir, 4)}
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="new-heir-address">{t("changeHeir.newLabel")}</FieldLabel>
              <div className="relative">
                <input
                  id="new-heir-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value.trim())}
                  placeholder={t("changeHeir.placeholder")}
                  spellCheck={false}
                  autoComplete="off"
                  maxLength={64}
                  className={cn(formInput, "pr-[84px] font-mono text-sm")}
                />
                <button
                  type="button"
                  onClick={paste}
                  className="absolute bottom-2 right-2 top-2 rounded-lg border border-tile-line bg-background px-3 text-xs font-bold uppercase tracking-[0.1em] transition-colors hover:bg-tile-soft"
                >
                  {t("changeHeir.paste")}
                </button>
              </div>
              {check.kind === "bad" && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-accent-red">
                  <X className="h-3.5 w-3.5" /> {t(check.key)}
                </p>
              )}
              {check.kind === "warn" && (
                <p className="mt-2 text-[13px] text-amber-700">{t("changeHeir.noHistory")}</p>
              )}
              {check.kind === "ok" && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-green-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} /> {t("changeHeir.validAddress")}
                </p>
              )}
            </div>

            <Callout tone="warn">{t("changeHeir.loseClaim", { name: currentName })}</Callout>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              <div className="rounded-[14px] border border-tile-line p-4">
                <div className="text-[13px] text-muted-foreground">{t("changeHeir.removing")}</div>
                <div className="mt-1 text-lg font-semibold">{currentName}</div>
                <div className="mt-1.5 break-all font-mono text-[15px] leading-normal text-muted-foreground line-through">
                  {estate.heir}
                </div>
              </div>
              <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="rounded-[14px] border border-foreground p-4">
                <div className="text-[13px] text-muted-foreground">{t("changeHeir.newHeir")}</div>
                <div className="mt-1.5 break-all font-mono text-[15px] leading-normal">
                  <EmphasisedAddress value={address} />
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-tile-line text-sm">
              {[
                [t("changeHeir.factAssets"), assetsMoving],
                [t("changeHeir.factVault"), t("changeHeir.factVaultValue")],
                [t("changeHeir.factTimer"), t("changeHeir.factTimerValue")],
                [t("changeHeir.factCost"), `~${formatSol(NETWORK_FEE_LAMPORTS, 6)} SOL`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 border-b border-tile-line px-4 py-3 last:border-b-0"
                >
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right">{v}</span>
                </div>
              ))}
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm leading-normal">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-foreground"
              />
              <span>{t("changeHeir.ack", { name: currentName })}</span>
            </label>
          </>
        )}
      </Modal>
    </>
  );
};

export default ReassignHeirSection;
