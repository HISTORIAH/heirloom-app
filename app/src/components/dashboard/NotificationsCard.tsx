import { Bell, Lock, Clock, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationsCardStatus } from "@/types/notifications";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  status: NotificationsCardStatus;
  /** Only rendered when status === "authorized" — e.g. "You: Email · Sarah: Email + SMS" */
  summary?: string;
  onAction: () => void;
}

const STATE_META: Record<
  Exclude<NotificationsCardStatus, "loading">,
  {
    icon: LucideIcon;
    badgeClass: string;
    textKey: string;
    textClass: string;
    buttonKey: string;
    buttonClass: string;
  }
> = {
  locked: {
    icon: Lock,
    badgeClass: "bg-secondary text-muted-foreground",
    textKey: "notifications.locked",
    textClass: "text-muted-foreground",
    buttonKey: "notifications.manage",
    buttonClass: "bg-accent-cyan",
  },
  off: {
    icon: Bell,
    badgeClass: "bg-accent-cyan",
    textKey: "notifications.off",
    textClass: "text-muted-foreground",
    buttonKey: "notifications.setUp",
    buttonClass: "bg-accent-cyan",
  },
  authorized: {
    icon: Bell,
    badgeClass: "bg-accent-cyan",
    textKey: "",
    textClass: "text-green-700 font-semibold",
    buttonKey: "notifications.edit",
    buttonClass: "bg-background hover:bg-secondary",
  },
  expired: {
    icon: Clock,
    badgeClass: "bg-accent-yellow",
    textKey: "notifications.expired",
    textClass: "text-amber-700 font-semibold",
    buttonKey: "notifications.signIn",
    buttonClass: "bg-accent-cyan",
  },
  error: {
    icon: AlertTriangle,
    badgeClass: "bg-accent-red text-white",
    textKey: "notifications.error",
    textClass: "text-destructive font-semibold",
    buttonKey: "notifications.retry",
    buttonClass: "bg-accent-red text-white",
  },
};

const NotificationsCard: React.FC<Props> = ({ status, summary, onAction }) => {
  const { t } = useTranslation("app");
  if (status === "loading") {
    return (
      <div className="neo-card-static">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-secondary animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-3 w-44 rounded bg-secondary animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-20 rounded-lg bg-secondary animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  const meta = STATE_META[status];
  const Icon = meta.icon;

  return (
    <div className="neo-card-static">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={cn("neo-border rounded-xl p-2 shrink-0", meta.badgeClass)}>
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl leading-tight">{t("notifications.title")}</h3>
            <p className={cn("text-sm truncate mt-0.5", meta.textClass)}>
              {status === "authorized" ? summary : t(meta.textKey)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "neo-border rounded-xl px-5 py-2.5 font-bold text-sm text-center hover:opacity-90 transition-opacity shrink-0",
            meta.buttonClass
          )}
        >
          {t(meta.buttonKey)}
        </button>
      </div>
    </div>
  );
};

export default NotificationsCard;
