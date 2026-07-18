import { SECONDS_PER_DAY } from "@/lib/constants";
import { Clock } from "lucide-react";

interface Props {
  heartbeatSeconds: number;
  setHeartbeatSeconds: (n: number) => void;
  graceSeconds: number;
  setGraceSeconds: (n: number) => void;
}

const HeartbeatStep: React.FC<Props> = ({
  heartbeatSeconds,
  setHeartbeatSeconds,
  graceSeconds,
  setGraceSeconds,
}) => {
  const heartbeatDays = Math.max(1, Math.round(heartbeatSeconds / SECONDS_PER_DAY));
  const graceDays = Math.max(1, Math.round(graceSeconds / SECONDS_PER_DAY));
  const totalDays = heartbeatDays + graceDays;

  const HEARTBEAT_PRESETS = [30, 60, 90, 180, 365];
  const GRACE_PRESETS = [7, 30, 60, 90];

  return (
    <div className="neo-card-static p-8" style={{ boxShadow: "12px 12px 0 0 hsl(var(--accent-cyan))" }}>
      {/* Step header inside the card */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="bg-accent-cyan neo-border rounded-xl p-3"
          style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
        >
          <Clock className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
            Step 3
          </span>
          <h3 className="text-xl font-semibold font-body">How often do you check in?</h3>
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground mb-4">
        You have <strong>1.5 SOL</strong> and <strong>1 heir</strong> in this vault. Choose how often you need to prove you&apos;re alive.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Heartbeat Interval */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Heartbeat Interval
          </label>
          <input
            type="range"
            min={1}
            max={365}
            value={heartbeatDays}
            onChange={(e) =>
              setHeartbeatSeconds(Number(e.target.value) * SECONDS_PER_DAY)
            }
            className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "hsl(var(--accent-cyan))" }}
          />
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Days
            </span>
            <span className="text-4xl font-semibold tabular-nums">{heartbeatDays}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {HEARTBEAT_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setHeartbeatSeconds(p * SECONDS_PER_DAY)}
                className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
                  heartbeatDays === p
                    ? "bg-accent-cyan"
                    : "bg-secondary hover:bg-accent-cyan/40"
                }`}
                style={
                  heartbeatDays === p
                    ? { boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }
                    : {}
                }
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* Grace Period */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Grace Period
          </label>
          <input
            type="range"
            min={1}
            max={90}
            value={graceDays}
            onChange={(e) =>
              setGraceSeconds(Number(e.target.value) * SECONDS_PER_DAY)
            }
            className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "hsl(var(--accent-cyan))" }}
          />
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Days
            </span>
            <span className="text-4xl font-semibold tabular-nums">{graceDays}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {GRACE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setGraceSeconds(p * SECONDS_PER_DAY)}
                className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
                  graceDays === p
                    ? "bg-accent-cyan"
                    : "bg-secondary hover:bg-accent-cyan/40"
                }`}
                style={
                  graceDays === p
                    ? { boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }
                    : {}
                }
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Total deadline summary */}
      <div className="mt-5 p-3 bg-accent-lime/20 neo-border rounded-xl">
        <p className="text-sm font-medium">
          Total deadline:{" "}
          <span className="text-lg font-semibold">{totalDays} days</span>
          {" "}— if you don&apos;t check in for this long, your heirs can claim.
        </p>
      </div>
    </div>
  );
};

export default HeartbeatStep;
