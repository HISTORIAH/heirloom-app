import type { ReactNode } from "react";
import { AlertTriangle, Check, ExternalLink, Info, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn, getSolanaExplorerTxUrl } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { TxStep } from "@/types/tx";

/**
 * Building blocks shared by the estate modals (Add asset, Check-in schedule, Change heir),
 * so the three read as one family.
 */

/** Dark primary or outline secondary. A disabled primary goes soft grey and its label says what's missing. */
export const FormButton: React.FC<ButtonProps & { tone?: "primary" | "secondary" }> = ({
  tone = "primary",
  className,
  ...props
}) => (
  <Button
    variant={tone === "primary" ? "flat" : "flat-outline"}
    className={cn(
      "h-auto rounded-xl px-5 py-[13px] text-xs tracking-[0.12em]",
      tone === "secondary" && "border border-tile-line hover:border-foreground hover:bg-transparent hover:text-foreground",
      "disabled:bg-tile-soft disabled:text-muted-foreground disabled:opacity-100",
      className,
    )}
    {...props}
  />
);

export const FieldLabel: React.FC<{ children: ReactNode; hint?: ReactNode; htmlFor?: string }> = ({
  children,
  hint,
  htmlFor,
}) => (
  <label htmlFor={htmlFor} className="mb-2.5 flex items-baseline justify-between gap-3 text-sm font-semibold">
    {children}
    {hint && <span className="text-[13px] font-normal text-muted-foreground">{hint}</span>}
  </label>
);

export const formInput =
  "w-full rounded-xl border border-tile-line bg-background px-4 py-3.5 text-base outline-hidden transition-colors focus:border-foreground";

export const Chip: React.FC<{
  on: boolean;
  onClick: () => void;
  small?: boolean;
  children: ReactNode;
}> = ({ on, onClick, small, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-[10px] border font-semibold transition-colors",
      small ? "px-3 py-[7px] text-xs" : "px-4 py-2.5 text-sm",
      on
        ? "border-foreground bg-foreground text-background"
        : "border-tile-line bg-background hover:border-foreground",
    )}
  >
    {children}
  </button>
);

const CALLOUT = {
  info: { className: "bg-tile-soft", icon: Info },
  warn: { className: "bg-amber-50 text-amber-800", icon: AlertTriangle },
  danger: { className: "bg-red-50 text-red-700", icon: AlertTriangle },
} as const;

export const Callout: React.FC<{ tone: keyof typeof CALLOUT; children: ReactNode }> = ({
  tone,
  children,
}) => {
  const { className, icon: Icon } = CALLOUT[tone];
  return (
    <div className={cn("flex gap-2.5 rounded-xl px-4 py-3.5 text-sm leading-normal", className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

const STEPS: { key: Exclude<TxStep, "idle" | "error">; label: string }[] = [
  { key: "approve", label: "tx.approve" },
  { key: "confirming", label: "tx.confirming" },
  { key: "done", label: "tx.done" },
];

/** The modal body once a transaction is under way: three steps, then the outcome. */
export const TxProgress: React.FC<{
  step: TxStep;
  txId: string | null;
  error: string | null;
  doneTitle: string;
  doneSummary: string;
}> = ({ step, txId, error, doneTitle, doneSummary }) => {
  const { t } = useTranslation("app");

  if (step === "done") {
    return (
      <div className="pb-1 pt-3 text-center">
        <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-green-50 text-green-700">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <h4 className="font-display text-[22px] font-semibold">{doneTitle}</h4>
        <p className="mt-1.5 text-muted-foreground">{doneSummary}</p>
        {txId && (
          <a
            href={getSolanaExplorerTxUrl(txId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3.5 inline-flex items-center gap-1 text-[13px] font-semibold hover:underline"
          >
            {t("common.viewOnExplorer")} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  const current = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="flex flex-col gap-0.5">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={s.key}
            className={cn(
              "flex items-center gap-3.5 py-3.5 text-[15px]",
              done || active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px]",
                done ? "border-foreground bg-foreground text-background" : "border-tile-line",
                active && "border-foreground",
              )}
            >
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {active && <Loader2 className="h-4 w-4 animate-spin" />}
            </span>
            {t(s.label)}
          </div>
        );
      })}
      {step === "error" && error && <Callout tone="danger">{error}</Callout>}
    </div>
  );
};
