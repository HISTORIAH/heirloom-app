import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SheetTone = "paper" | "accent" | "alert";

const headTone: Record<SheetTone, string> = {
  paper: "bg-tile-soft",
  accent: "bg-accent-yellow",
  alert: "bg-accent-red text-background",
};

/**
 * Every overlay in the app is this sheet: paper on a dimmed page, one band of
 * colour across the head, the body ruled the same way the pages are. Dialogs
 * used to each invent their own frame, which is why the product read as a
 * dozen different apps.
 */
const Sheet = ({
  open,
  title,
  caption,
  tone = "paper",
  size = "md",
  icon,
  busy = false,
  onClose,
  footer,
  children,
  labelledBy = "sheet-title",
  role = "dialog",
}: {
  open: boolean;
  title: ReactNode;
  /** Small uppercase line above the title. */
  caption?: ReactNode;
  tone?: SheetTone;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
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
        <div className={cn("sheet-head", headTone[tone])}>
          <div className="flex min-w-0 items-center gap-3">
            {icon ? <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{icon}</span> : null}
            <div className="min-w-0">
              {caption ? (
                <p
                  className={cn(
                    "cap mb-1",
                    tone === "alert" ? "text-background/70" : "text-foreground/55",
                  )}
                >
                  {caption}
                </p>
              ) : null}
              <h2
                id={labelledBy}
                className="truncate font-display text-base font-semibold tracking-[-0.02em] md:text-lg"
              >
                {title}
              </h2>
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className={cn(
                "-mr-1 shrink-0 rounded-md p-1.5 transition-colors disabled:opacity-40",
                tone === "alert" ? "hover:bg-background/20" : "hover:bg-foreground/10",
              )}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {children ? <div className="px-5 py-5 md:px-6">{children}</div> : null}

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
