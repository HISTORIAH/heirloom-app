import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

/** The five stops reminders go out on: ink up to the due day, orange through grace to the heir. */
const STOPS = [
  { title: "notifications.tl7Days", sub: "notifications.tl7DaysSub", phase: "check-in" },
  { title: "notifications.tlDue", sub: "notifications.tlDueSub", phase: "check-in" },
  { title: "notifications.tlMid", sub: "notifications.tlMidSub", phase: "grace" },
  { title: "notifications.tl1Day", sub: "notifications.tl1DaySub", phase: "grace" },
  { title: "notifications.tlHeir", sub: "notifications.tlHeirSub", phase: "heir" },
] as const;

/** When reminders go out, fixed server-side. Checking in starts a new cycle. */
export default function ReminderTimeline() {
  const { t } = useTranslation("app");
  return (
    <div className="rounded-xl border border-tile-line bg-background px-2 py-4">
      <div className="relative">
        <span aria-hidden className="absolute left-[10%] right-1/2 top-[6px] h-0.5 bg-foreground" />
        <span
          aria-hidden
          className="absolute left-1/2 right-[10%] top-[5px] h-1 rounded-full bg-accent-orange"
        />
        <ol className="relative grid grid-cols-5">
          {STOPS.map((stop) => (
            <li key={stop.title} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 border-foreground",
                  stop.phase === "check-in" && "bg-background",
                  stop.phase === "grace" && "bg-accent-orange/40",
                  stop.phase === "heir" && "bg-accent-orange",
                )}
              />
              <span className="text-xs font-bold leading-tight">
                {t(stop.title)}
                <span className="block font-medium text-muted-foreground">{t(stop.sub)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
