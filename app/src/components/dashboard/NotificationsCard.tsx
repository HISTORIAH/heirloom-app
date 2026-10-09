import { Bell, Lock, Clock, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD_CARD } from "@/components/dashboard/estateState";
import { cn } from "@/lib/utils";
import type { NotificationsCardStatus } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  status: NotificationsCardStatus;
  /** Rendered for "authorized" and "pending", e.g. "You: Telegram · Sarah: waiting for Telegram" */
  summary?: string;
  onAction: () => void;
}

type ButtonVariant = "flat" | "flat-outline" | "flat-destructive";

const STATE_META: Record<
  Exclude<NotificationsCardStatus, "loading">,
  {
    icon: LucideIcon;
    iconClass?: string;
    textKey: string;
    textClass: string;
    buttonKey: string;
    buttonVariant: ButtonVariant;
  }
> = {
  locked: {
    icon: Lock,
    textKey: "notifications.locked",
    textClass: "text-muted-foreground",
    buttonKey: "notifications.signToUnlock",
    buttonVariant: "flat",
  },
  off: {
    icon: Bell,
    textKey: "notifications.off",
    textClass: "text-muted-foreground",
    buttonKey: "notifications.setUp",
    buttonVariant: "flat",
  },
  authorized: {
    icon: Bell,
    textKey: "",
    textClass: "text-green-700 font-semibold",
    buttonKey: "notifications.edit",
    buttonVariant: "flat-outline",
  },
  pending: {
    icon: Clock,
    textKey: "",
    textClass: "text-amber-700 font-semibold",
    buttonKey: "notifications.edit",
    buttonVariant: "flat-outline",
  },
  expired: {
    icon: Clock,
    textKey: "notifications.expired",
    textClass: "text-amber-700 font-semibold",
    buttonKey: "notifications.signIn",
    buttonVariant: "flat",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "text-accent-red",
    textKey: "notifications.error",
    textClass: "text-destructive font-semibold",
    buttonKey: "notifications.retry",
    buttonVariant: "flat-destructive",
  },
};

const NotificationsCard: React.FC<Props> = ({ status, summary, onAction }) => {
  const { t } = useTranslation("app");
  if (status === "loading") {
    return (
      <div className={cn("border border-tile-line bg-background", DASHBOARD_CARD)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-[10px] bg-secondary animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-3 w-44 rounded bg-secondary animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-24 rounded-lg bg-secondary animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  const meta = STATE_META[status];
  const Icon = meta.icon;

  return (
    <div className={cn("border border-tile-line bg-background", DASHBOARD_CARD)}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-tile-line bg-tile-soft">
            <Icon className={cn("h-[18px] w-[18px]", meta.iconClass)} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
              {t("notifications.title")}
            </h3>
            <p className={cn("mt-0.5 text-sm", meta.textClass)}>
              {status === "authorized" || status === "pending" ? summary : t(meta.textKey)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={meta.buttonVariant}
          size="sm"
          onClick={onAction}
          className="ml-auto shrink-0 tracking-[0.12em]"
        >
          {t(meta.buttonKey)}
        </Button>
      </div>
    </div>
  );
};

export default NotificationsCard;
