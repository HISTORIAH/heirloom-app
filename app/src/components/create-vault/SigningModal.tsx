import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getSolanaExplorerTxUrl, truncateAddress } from "@/lib/utils";
import { useTranslation, type TFunction } from "@heirloom/i18n";
import type { CreateAssetId, CreateEstateDraft, CreateEstateProgress } from "@/types/create";
import type { TxFailure } from "@/types/tx";

type RowState = "pending" | "active" | "done" | "error";

type Row = {
  key: string;
  state: RowState;
  /** The number shown in the circle while pending or waiting on the wallet. */
  number: number;
  spinning?: boolean;
  title: string;
  tag?: string;
  sub?: string;
  signature?: string | null;
};

type Props = {
  progress: CreateEstateProgress;
  draft: CreateEstateDraft | null;
  /** How many assets the estate holds, for the one-transaction copy. */
  assetCount: number;
  assetLabel: (asset: CreateAssetId) => string;
  /** When the first check-in falls due, already formatted. */
  nextCheckInDate: string;
  /** SOL the wallet needs for the whole thing, already formatted. Null while unknown. */
  requiredSol: string | null;
  onRetry: () => void;
  onBackToReview: () => void;
  onDone: () => void;
};

/** What the failed row says under its title. */
function failureRowText(t: TFunction, error: TxFailure | null): string {
  if (!error) return t("createVault.signing.failedRow");
  if (error.kind === "rejected") return t("createVault.signing.rejectedRow");
  if (error.kind === "insufficientSol") return t("createVault.signing.insufficientRow");
  if (error.kind === "expired") return t("createVault.signing.expiredRow");
  return error.detail ?? t("createVault.signing.failedRow");
}

/** The two steps of a single transaction: the wallet's approval, then the cluster's. */
function singleTxRows(t: TFunction, progress: CreateEstateProgress, assetCount: number): Row[] {
  const { status, stage, error } = progress;
  if (status === "done") {
    return [
      {
        key: "created",
        state: "done",
        number: 1,
        title: t("createVault.signing.estateCreated"),
        sub: t("createVault.signing.assetsRegistered", { count: assetCount }),
        signature: progress.signatures[0],
      },
    ];
  }

  const failed = status === "error";
  const signed = stage === "confirming";
  const approve: Row = signed
    ? { key: "approve", state: "done", number: 1, title: t("createVault.signing.signed") }
    : {
        key: "approve",
        state: failed ? "error" : "active",
        number: 1,
        title: t("createVault.signing.approve"),
        sub: failed ? failureRowText(t, error) : t("createVault.signing.waiting"),
      };
  const confirm: Row = !signed
    ? {
        key: "confirm",
        state: "pending",
        number: 2,
        title: t("createVault.signing.confirmOnSolana"),
        sub: failed ? t("createVault.signing.notStarted") : t("createVault.signing.usuallySeconds"),
      }
    : failed
      ? {
          key: "confirm",
          state: "error",
          number: 2,
          title: t("createVault.signing.confirmOnSolana"),
          sub: failureRowText(t, error),
        }
      : {
          key: "confirm",
          state: "active",
          number: 2,
          spinning: true,
          title: t("createVault.signing.confirming"),
          sub: t("createVault.signing.keepOpen"),
        };
  return [approve, confirm];
}

/** One row per transaction kit planned, each tagged "Tx i of N". */
function multiTxRows(
  t: TFunction,
  progress: CreateEstateProgress,
  draft: CreateEstateDraft,
): Row[] {
  const total = draft.transactions.length;
  const { status, stage, current, error, signatures } = progress;
  return draft.transactions.map((tx, index) => {
    const count = tx.assets.length;
    const row: Row = {
      key: `tx-${index}`,
      state: "pending",
      number: index + 1,
      tag: t("createVault.signing.txTag", { index: index + 1, total }),
      title: tx.createsEstate
        ? t("createVault.signing.createWith", { count })
        : t("createVault.signing.register", { count }),
    };
    if (signatures[index]) {
      return {
        ...row,
        state: "done",
        sub: t("createVault.signing.confirmed"),
        signature: signatures[index],
      };
    }
    if (index === current && status === "error") {
      return { ...row, state: "error", sub: failureRowText(t, error) };
    }
    if (index === current && status === "running") {
      return stage === "signing"
        ? { ...row, state: "active", sub: t("createVault.signing.waiting") }
        : { ...row, state: "active", spinning: true, sub: t("createVault.signing.confirming") };
    }
    if (status === "error") return { ...row, sub: t("createVault.signing.notStarted") };
    return index === current + 1 ? { ...row, sub: t("createVault.signing.next") } : row;
  });
}

const RowIcon: React.FC<{ row: Row }> = ({ row }) => {
  if (row.state === "done") return <Check className="h-4 w-4" strokeWidth={3} />;
  if (row.state === "error") return <X className="h-4 w-4" strokeWidth={3} />;
  if (row.spinning) return <Loader2 className="h-4 w-4 animate-spin" />;
  return <>{row.number}</>;
};

const TxRow: React.FC<{ row: Row }> = ({ row }) => {
  const { t } = useTranslation("app");
  return (
    <li
      className={cn(
        "grid grid-cols-[1.8rem_minmax(0,1fr)] items-start gap-3 rounded-xl border p-[0.9rem]",
        row.state === "active" && "border-foreground",
        row.state === "error" && "border-destructive bg-destructive/10",
        (row.state === "pending" || row.state === "done") && "border-tile-line",
      )}
    >
      <span
        className={cn(
          "grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full border-[1.5px] font-mono text-[0.78rem] font-semibold",
          row.state === "pending" && "border-tile-line text-muted-foreground",
          row.state === "active" && "border-foreground text-foreground",
          row.state === "done" && "border-green-700 bg-green-700 text-white",
          row.state === "error" && "border-destructive bg-destructive text-destructive-foreground",
        )}
      >
        <RowIcon row={row} />
      </span>
      <div className="min-w-0">
        <div className="font-semibold">
          {row.title}
          {row.tag && (
            <span className="ml-[0.4rem] font-mono text-[0.7rem] font-medium text-muted-foreground">
              {row.tag}
            </span>
          )}
        </div>
        {row.sub && (
          <div
            className={cn(
              "mt-[0.1rem] text-[0.85rem]",
              row.state === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {row.sub}
          </div>
        )}
        {row.signature && (
          <div className="mt-1 font-mono text-[0.78rem] text-muted-foreground">
            {truncateAddress(row.signature, 4)} ·{" "}
            <a
              href={getSolanaExplorerTxUrl(row.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {t("createVault.signing.viewOnExplorer")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </li>
  );
};

/**
 * The signing modal for creating an estate. Walks through each transaction kit planned:
 * waiting on the wallet, then on the cluster. Failures show here rather than as a toast,
 * with a way back or a retry; when the estate landed but a later transaction didn't, it
 * offers to finish registering from where it stopped.
 */
const SigningModal: React.FC<Props> = ({
  progress,
  draft,
  assetCount,
  assetLabel,
  nextCheckInDate,
  requiredSol,
  onRetry,
  onBackToReview,
  onDone,
}) => {
  const { t } = useTranslation("app");
  const { status, stage, current, error, signatures } = progress;
  const total = draft?.transactions.length ?? 1;
  const multi = total > 1;
  const estateCreated = signatures[0] != null;
  const partial = status === "error" && estateCreated;
  const canGoBack = status === "error" && !estateCreated;

  useEffect(() => {
    if (!canGoBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBackToReview();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canGoBack, onBackToReview]);

  const rows =
    multi && draft ? multiTxRows(t, progress, draft) : singleTxRows(t, progress, assetCount);

  const eyebrow =
    status === "done"
      ? t("createVault.signing.eyebrowDone")
      : multi
        ? t("createVault.signing.eyebrowStep", { index: current + 1, total })
        : t("createVault.signing.eyebrow");

  let title = t("createVault.signing.title");
  let lead: string;
  let buttons: ReactNode = null;

  const backButton = (
    <Button key="back" variant="flat-outline" size="sm" onClick={onBackToReview}>
      {t("createVault.signing.backToReview")}
    </Button>
  );
  const retryButton = (
    <Button key="retry" variant="flat" size="sm" onClick={onRetry}>
      {t("createVault.signing.tryAgain")}
    </Button>
  );

  if (status === "done") {
    title = t("createVault.signing.titleDone");
    lead = t("createVault.signing.leadDone", { date: nextCheckInDate });
    buttons = (
      <Button variant="flat" size="sm" onClick={onDone}>
        {t("createVault.signing.goToDashboard")}
      </Button>
    );
  } else if (partial) {
    const missing = (draft?.transactions ?? [])
      .slice(current)
      .flatMap((tx) => tx.assets)
      .map(assetLabel);
    title = t("createVault.signing.partialTitle");
    lead = t("createVault.signing.partialLead", { assets: missing.join(", ") });
    buttons = (
      <>
        <Button variant="flat-outline" size="sm" onClick={onDone}>
          {t("createVault.signing.goToDashboard")}
        </Button>
        <Button variant="flat" size="sm" onClick={onRetry}>
          {t("createVault.signing.finishRegistering")}
        </Button>
      </>
    );
  } else if (status === "error") {
    const kind = error?.kind ?? "unknown";
    if (kind === "rejected") {
      title = t("createVault.signing.rejectedTitle");
      lead = t("createVault.signing.rejectedLead");
      buttons = [backButton, retryButton];
    } else if (kind === "insufficientSol") {
      title = t("createVault.signing.insufficientTitle");
      lead = t("createVault.signing.insufficientLead", { amount: requiredSol ?? "?" });
      buttons = backButton;
    } else if (kind === "expired") {
      title = t("createVault.signing.expiredTitle");
      lead = t("createVault.signing.expiredLead");
      buttons = [backButton, retryButton];
    } else {
      title = t("createVault.signing.failedTitle");
      const reason = error?.detail?.replace(/\.$/, "");
      lead = !reason
        ? t("createVault.signing.unknownLeadPlain")
        : kind === "program"
          ? t("createVault.signing.programLead", { reason })
          : t("createVault.signing.unknownLead", { reason });
      buttons = [backButton, retryButton];
    }
  } else if (!multi) {
    lead = t("createVault.signing.leadOne", { count: assetCount });
  } else if (current === total - 1) {
    lead = t("createVault.signing.leadLast");
  } else {
    lead =
      total === 2
        ? t("createVault.signing.leadTwo")
        : t("createVault.signing.leadMany", { count: total });
  }

  const awaitingWallet = status === "running" && stage === "signing";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signing-modal-title"
      className="fixed inset-0 z-[70] overflow-y-auto bg-foreground/25 backdrop-blur-[2px]"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="modal-rise w-[min(30rem,100%)] rounded-2xl border border-tile-line bg-background p-[1.65rem] shadow-[0_30px_80px_-20px_hsl(var(--foreground)/0.35)]">
          <span className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </span>
          <h2
            id="signing-modal-title"
            className="mb-1 mt-[0.4rem] font-display text-[1.55rem] font-semibold tracking-[-0.01em]"
          >
            {title}
          </h2>
          <p className="mb-5 text-[0.92rem] text-muted-foreground" aria-live="polite">
            {lead}
          </p>

          <ul className="grid gap-[0.65rem]">
            {rows.map((row) => (
              <TxRow key={row.key} row={row} />
            ))}
          </ul>

          {awaitingWallet && (
            <div className="mt-4 flex items-center gap-[0.65rem] rounded-xl bg-tile-soft px-[0.9rem] py-3 text-[0.85rem]">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span>
                <b className="font-semibold">{t("createVault.signing.walletHintStrong")}</b>{" "}
                {t("createVault.signing.walletHint")}
              </span>
            </div>
          )}

          {buttons && (
            <div className="mt-5 flex flex-wrap justify-end gap-[0.65rem]">{buttons}</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SigningModal;
