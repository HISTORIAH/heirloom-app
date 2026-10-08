import { Mail, MessageSquare, Send, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReminderChannel } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

/** Delivered channels in tab order, then SMS greyed out until the backend sends it. */
const TABS: { channel: ReminderChannel; icon: LucideIcon; labelKey: string; soon?: boolean }[] = [
  { channel: "telegram", icon: Send, labelKey: "notifications.channelTelegram" },
  { channel: "email", icon: Mail, labelKey: "notifications.channelEmail" },
  { channel: "sms", icon: MessageSquare, labelKey: "notifications.channelSms", soon: true },
];

/**
 * Segmented channel picker: an ink pill glides under the picked tab. Channels this role already
 * has are left out.
 */
export default function ChannelTabs({
  channels,
  value,
  onChange,
  disabled,
}: {
  channels: ReminderChannel[];
  value: ReminderChannel;
  onChange: (channel: ReminderChannel) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("app");
  const tabs = TABS.filter((tab) => tab.soon || channels.includes(tab.channel));
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.channel === value),
  );

  return (
    <div
      role="tablist"
      className={cn(
        "relative grid h-12 rounded-lg border-2 border-foreground bg-background p-1",
        disabled && "opacity-50",
      )}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-md bg-foreground transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${tabs.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {tabs.map((tab) => {
        const on = !tab.soon && tab.channel === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.channel}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={tab.soon || disabled}
            onClick={() => onChange(tab.channel)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-md text-sm font-bold transition-colors duration-200",
              on ? "text-background" : "text-foreground",
              tab.soon && "cursor-not-allowed text-muted-foreground/60",
              !on && !tab.soon && "hover:bg-tile-soft",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
            {t(tab.labelKey)}
            {tab.soon && (
              <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                {t("notifications.soon")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
