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
  size?: "sm" | "md" | "lg";
  /** Blocks the overlay click, the escape key, and the close button. */
  busy?: boolean;
  /** Hide the close control and ignore overlay / Escape. For progress overlays. */
  closable?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
}

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
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
