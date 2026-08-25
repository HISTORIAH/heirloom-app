import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Every overlay in the app is this sheet, and it opens the way a page does:
 * a caption at the margin, the title set large under it, the sentence that
 * explains it, then a rule and the work itself.
 *
 * It carries no coloured head band and no icon tile. Both were doing the job
 * the title should do, and a band of fill across the top of a white sheet is
 * the one thing that made a dialog read as a different product from the page
 * that opened it.
 */
const Sheet = ({
  open,
  title,
  caption,
  description,
  size = "md",
  busy = false,
  onClose,
  footer,
  children,
  labelledBy = "sheet-title",
  role = "dialog",
}: {
  open: boolean;
  title: ReactNode;
  /** Small uppercase line above the title — which part of the app this belongs to. */
  caption?: ReactNode;
  /** One sentence under the title. Lives in the head, not in the body. */
  description?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** While busy the sheet refuses to close — a signature is in flight. */
  busy?: boolean;
  onClose?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  labelledBy?: string;
  role?: "dialog" | "alertdialog";
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="scrim"
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={() => {
        if (!busy) onClose?.();
      }}
    >
      <div
        className={cn(
          "sheet rise-in my-auto",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-5 pt-5 md:px-6 md:pb-6 md:pt-6">
          <div className="flex items-start justify-between gap-4">
            {caption ? <p className="cap pt-1">{caption}</p> : <span />}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-tile-line transition-colors hover:border-foreground hover:bg-tile-soft disabled:opacity-40"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}
          </div>

          <h2
            id={labelledBy}
            className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] md:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2.5 max-w-[46ch] text-sm font-medium leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {children ? (
          <div className="border-t border-tile-line px-5 py-5 md:px-6 md:py-6">{children}</div>
        ) : null}

        {footer ? (
          <div className="flex flex-col-reverse gap-2.5 border-t border-tile-line px-5 py-4 sm:flex-row sm:justify-end md:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export default Sheet;
