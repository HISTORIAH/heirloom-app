import { Bell, Lock, Clock, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/Panel";
import { cn } from "@/lib/utils";
import type { NotificationsCardStatus } from "@/types/notifications";
import type { ButtonProps } from "@/components/ui/button";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  status: NotificationsCardStatus;
  /** Only rendered when status === "authorized" — e.g. "You: Email · Sarah: Email + SMS" */
  summary?: string;
  onAction: () => void;
}

/**
 * Notification state is a status line, not a colour scheme: the icon and the
 * verb change, the panel does not. Only the two states that need something
 * from the reader — expired, error — carry any colour at all.
 */
const STATE_META: Record<
  Exclude<NotificationsCardStatus, "loading">,
  {
    icon: LucideIcon;
    iconClass: string;
    textKey: string;
    textClass: string;
    buttonKey: string;
    buttonVariant: ButtonProps["variant"];
  }
> = {
  locked: {
    icon: Lock,
    iconClass: "text-muted-foreground",
    textKey: "notifications.locked",
    textClass: "text-muted-foreground",
    buttonKey: "notifications.manage",
    buttonVariant: "outline",
  },
  off: {
    icon: Bell,
    iconClass: "text-muted-foreground",
    textKey: "notifications.off",
    textClass: "text-muted-foreground",
    buttonKey: "notifications.setUp",
    buttonVariant: "yellow",
  },
  authorized: {
    icon: Bell,
    iconClass: "text-foreground",
    textKey: "",
    textClass: "text-foreground font-semibold",
    buttonKey: "notifications.edit",
    buttonVariant: "outline",
  },
  expired: {
    icon: Clock,
    iconClass: "text-foreground",
    textKey: "notifications.expired",
    textClass: "text-foreground font-semibold",
    buttonKey: "notifications.signIn",
    buttonVariant: "yellow",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "text-accent-red",
    textKey: "notifications.error",
    textClass: "text-accent-red font-semibold",
    buttonKey: "notifications.retry",
    buttonVariant: "destructive-outline",
  },
};

const NotificationsCard: React.FC<Props> = ({ status, summary, onAction }) => {
  const { t } = useTranslation("app");

  if (status === "loading") {
    return (
      <Panel>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-tile-soft" />
            <div className="h-3 w-40 animate-pulse rounded bg-tile-soft" />
          </div>
          <div className="h-9 w-20 shrink-0 animate-pulse rounded-lg bg-tile-soft" />
        </div>
      </Panel>
    );
  }

  const meta = STATE_META[status];
  const Icon = meta.icon;

  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.iconClass)} strokeWidth={2} />
          <div className="min-w-0">
            <p className="cap cap-ink">{t("notifications.title")}</p>
            <p className={cn("mt-1.5 truncate text-sm", meta.textClass)}>
              {status === "authorized" ? summary : t(meta.textKey)}
            </p>
          </div>
        </div>
        <Button variant={meta.buttonVariant} size="sm" onClick={onAction} className="shrink-0">
          {t(meta.buttonKey)}
        </Button>
      </div>
    </Panel>
  );
};

export default NotificationsCard;
