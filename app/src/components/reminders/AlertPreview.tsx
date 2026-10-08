import { Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeirProfile } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

/**
 * The heir alert's personal parts as they're typed: who it's from, who it's to, the note. Only
 * what the owner writes is drawn; the backend's own wording around it isn't repeated here.
 */
export default function AlertPreview({ profile }: { profile: HeirProfile }) {
  const { t } = useTranslation("app");
  const owner = profile.ownerName?.trim() ?? "";
  const heir = profile.heirName?.trim() ?? "";
  const note = profile.note?.trim() ?? "";

  return (
    <figure
      aria-label={t("notifications.previewTitle")}
      className="overflow-hidden rounded-xl border-2 border-foreground bg-foreground text-background shadow-[0_20px_48px_-28px_hsl(var(--foreground)/0.6)]"
    >
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors duration-300",
              owner
                ? "border-accent-yellow bg-accent-yellow text-foreground"
                : "border-dashed border-muted-foreground bg-transparent",
            )}
          >
            {owner.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-base font-bold",
                owner ? "text-background" : "text-muted-foreground",
              )}
            >
              {owner || t("notifications.previewYourName")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {t("notifications.previewTo", {
                name: heir || t("notifications.previewYourHeir"),
              })}
            </p>
          </div>
          <Bell className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        </div>

        {note ? (
          <blockquote
            key="note"
            className="seal-rise flex gap-3 whitespace-pre-line break-words text-[15px] font-medium leading-relaxed"
          >
            <span aria-hidden className="w-[3px] shrink-0 rounded-full bg-accent-yellow" />
            <span className="min-w-0">{note}</span>
          </blockquote>
        ) : (
          <p className="text-sm text-muted-foreground">{t("notifications.previewNoteEmpty")}</p>
        )}
      </div>
      <figcaption className="flex items-center gap-2 bg-foreground/90 px-5 py-2.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-background/10">
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        {t("notifications.previewSent")}
      </figcaption>
    </figure>
  );
}
