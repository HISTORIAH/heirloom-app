import { Bell, Lock, Clock, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationsCardStatus } from "@/types/notifications";

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
    text: string;
    textClass: string;
    buttonLabel: string;
    buttonClass: string;
  }
> = {
  locked: {
    icon: Lock,
    badgeClass: "bg-secondary text-muted-foreground",
    text: "Sign in to view current settings",
    textClass: "text-muted-foreground",
    buttonLabel: "Manage",
    buttonClass: "bg-accent-cyan",
  },
  off: {
    icon: Bell,
    badgeClass: "bg-accent-cyan",
    text: "Off — you won't be reminded before your heartbeat is due",
    textClass: "text-muted-foreground",
    buttonLabel: "Set up",
    buttonClass: "bg-accent-cyan",
  },
  authorized: {
    icon: Bell,
    badgeClass: "bg-accent-cyan",
    text: "",
    textClass: "text-green-700 font-semibold",
    buttonLabel: "Edit",
    buttonClass: "bg-background hover:bg-secondary",
  },
  expired: {
    icon: Clock,
    badgeClass: "bg-accent-yellow",
    text: "Session expired — sign in again to make changes",
    textClass: "text-amber-700 font-semibold",
    buttonLabel: "Sign in",
    buttonClass: "bg-accent-cyan",
  },
  error: {
    icon: AlertTriangle,
    badgeClass: "bg-accent-red text-white",
    text: "Couldn't verify — try again",
    textClass: "text-destructive font-semibold",
    buttonLabel: "Retry",
    buttonClass: "bg-accent-red text-white",
  },
};

const NotificationsCard: React.FC<Props> = ({ status, summary, onAction }) => {
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
            <h3 className="text-xl leading-tight">Notifications</h3>
            <p className={cn("text-sm truncate mt-0.5", meta.textClass)}>
              {status === "authorized" ? summary : meta.text}
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
          {meta.buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default NotificationsCard;
