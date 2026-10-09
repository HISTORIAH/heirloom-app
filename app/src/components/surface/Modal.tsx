import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type TileTone } from "@/components/surface/tones";
import { useTranslation } from "@heirloom/i18n";

export interface ModalProps {
  open: boolean;
  title: string;
  cap?: string;
  description?: ReactNode;
  tone?: TileTone;
  size?: "sm" | "md" | "lg" | "xl";
  /** Blocks the overlay click, the escape key, and the close button. */
  busy?: boolean;
  /** Hide the close control and ignore overlay / Escape. For progress overlays. */
  closable?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  /**
   * "form": the roomier layout used by the dashboard's estate modals (Add asset, Check-in
   * schedule, Change heir) — 540px, a 32px title, a tinted footer with a cost line.
   */
  layout?: "default" | "form";
  /** Form layout only: the transaction's cost, shown at the left of the footer. */
  cost?: ReactNode;
}

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  /** Two panes side by side on desktop. */
  xl: "max-w-4xl",
} as const;

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  cap,
  description,
  tone = "paper",
  size = "md",
  busy = false,
  closable = true,
  onClose,
  footer,
  children,
  role = "dialog",
  labelledBy,
  layout = "default",
  cost,
}) => {
  const { t } = useTranslation("app");
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && closable) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, closable, onClose]);

  if (!open) return null;

  if (layout === "form") {
    // Wider than the handoff's 540px: on large displays that read as cramped. "lg" is for
    // modals with a list in them (the token picker).
    const formWidth = size === "lg" || size === "xl" ? "max-w-[680px]" : "max-w-[600px]";
    return createPortal(
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-[70] overflow-y-auto bg-foreground/35 backdrop-blur-[8px]"
        onClick={() => {
          if (!busy && closable) onClose();
        }}
      >
        <div className="flex min-h-full items-center justify-center px-4 py-12">
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "modal-rise w-full overflow-hidden rounded-[20px] shadow-[0_30px_80px_hsl(var(--foreground)/0.18)]",
              formWidth,
              toneStyles[tone],
            )}
          >
            <div className="relative px-5 pb-6 pt-8 sm:px-8">
              {cap && (
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {cap}
                </span>
              )}
              <h3
                id={titleId}
                className="mt-2.5 pr-12 font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em]"
              >
                {title}
              </h3>
              {description && (
                <p className="mt-2 max-w-[460px] text-[15px] leading-normal text-muted-foreground">
                  {description}
                </p>
              )}
              {closable && (
                <button
                  onClick={onClose}
                  disabled={busy}
                  aria-label={t("common.close")}
                  className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-[10px] border border-tile-line transition-colors hover:bg-tile-soft disabled:opacity-40"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>

            {children && (
              <div className="flex flex-col gap-[22px] px-5 pb-7 pt-1 sm:px-8">{children}</div>
            )}

            {(footer || cost) && (
              <div className="flex flex-wrap items-center gap-3 border-t border-tile-line bg-tile-soft/40 px-5 py-5 sm:flex-nowrap sm:px-8">
                <span className="w-full text-sm text-muted-foreground sm:mr-auto sm:w-auto">
                  {cost}
                </span>
                <div className="ml-auto flex gap-3">{footer}</div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] overflow-y-auto bg-foreground/25 backdrop-blur-[3px]"
      onClick={() => {
        if (!busy && closable) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "modal-rise w-full overflow-hidden rounded-xl shadow-[0_24px_64px_-24px_hsl(var(--foreground)/0.35)]",
            WIDTHS[size],
            toneStyles[tone],
          )}
        >
        <div className="flex items-start justify-between gap-4 border-b border-tile-line px-6 py-5">
          <div className="min-w-0">
            {cap && (
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {cap}
              </span>
            )}
            <h3 id={titleId} className={cn("ed-h3", cap && "mt-2")}>
              {title}
            </h3>
            {description && (
              <p className="mt-2 text-sm font-medium text-muted-foreground">{description}</p>
            )}
          </div>
          {closable && (
            <button
              onClick={onClose}
              disabled={busy}
              aria-label={t("common.close")}
              className="shrink-0 rounded-lg border border-tile-line p-2 transition-colors hover:bg-tile-soft disabled:opacity-40"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {children && <div className="px-6 py-5">{children}</div>}

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-tile-line px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** A read-only key/value strip: balances, addresses, whatever the dialog is about. */
export const ModalStat: React.FC<{ label: string; value: ReactNode; className?: string }> = ({
  label,
  value,
  className,
}) => (
  <div
    className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-tile-line bg-tile-soft px-4 py-3",
      className,
    )}
  >
    <span className="ed-label">{label}</span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
);
