import { SECONDS_PER_DAY } from "@/lib/constants";
import { formatDuration as fmtDuration } from "@/lib/utils";
import { Heart, Clock, Shield } from "lucide-react";

const formatDuration = (s: number) => fmtDuration(s, { long: true });

const HEARTBEAT_PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "30d", seconds: 30 * SECONDS_PER_DAY },
  { label: "60d", seconds: 60 * SECONDS_PER_DAY },
  { label: "90d", seconds: 90 * SECONDS_PER_DAY },
  { label: "180d", seconds: 180 * SECONDS_PER_DAY },
  { label: "365d", seconds: 365 * SECONDS_PER_DAY },
];

const GRACE_PRESETS = [
  { label: "15s", seconds: 15 },
  { label: "30s", seconds: 30 },
  { label: "7d", seconds: 7 * SECONDS_PER_DAY },
  { label: "14d", seconds: 14 * SECONDS_PER_DAY },
  { label: "30d", seconds: 30 * SECONDS_PER_DAY },
  { label: "60d", seconds: 60 * SECONDS_PER_DAY },
  { label: "90d", seconds: 90 * SECONDS_PER_DAY },
];

const PAUSE_PRESETS = [
  { label: "None", seconds: 0 },
  { label: "7d", seconds: 7 * SECONDS_PER_DAY },
  { label: "30d", seconds: 30 * SECONDS_PER_DAY },
];

interface Props {
  heartbeatSeconds: number;
  setHeartbeatSeconds: (n: number) => void;
  graceSeconds: number;
  setGraceSeconds: (n: number) => void;
  pauseSeconds: number;
  setPauseSeconds: (n: number) => void;
}

const HeartbeatStep: React.FC<Props> = ({
  heartbeatSeconds,
  setHeartbeatSeconds,
  graceSeconds,
  setGraceSeconds,
  pauseSeconds,
  setPauseSeconds,
}) => {
  const heartbeatSliderDays = Math.max(1, Math.round(heartbeatSeconds / SECONDS_PER_DAY));
  const graceSliderDays = Math.max(1, Math.round(graceSeconds / SECONDS_PER_DAY));

  return (
    <div className="space-y-6">
      <div>
        <span className="neo-badge bg-accent-pink mb-4 inline-block">Step 1</span>
        <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
          Set your <span className="bg-accent-pink px-2 inline-block rotate-[-1deg]">heartbeat.</span>
        </h2>
        <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
          How often will you check in? If you miss a heartbeat, the grace period starts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="neo-card-static">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-accent-pink neo-border rounded-xl p-3">
              <Heart className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black">Heartbeat Interval</h3>
          </div>
          <div className="space-y-4">
            <input
              type="range"
              min={1}
              max={365}
              value={heartbeatSliderDays}
              onChange={(e) => setHeartbeatSeconds(Number(e.target.value) * SECONDS_PER_DAY)}
              className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-pink"
            />
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {heartbeatSeconds < SECONDS_PER_DAY ? "Seconds" : "Days"}
              </span>
              <span className="text-5xl font-black tabular-nums">
                {heartbeatSeconds < SECONDS_PER_DAY ? heartbeatSeconds : Math.round(heartbeatSeconds / SECONDS_PER_DAY)}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {HEARTBEAT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setHeartbeatSeconds(p.seconds)}
                  className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${
                    heartbeatSeconds === p.seconds ? "bg-accent-pink neo-shadow-sm" : "bg-secondary hover:bg-accent-pink/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="neo-card-static">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-accent-yellow neo-border rounded-xl p-3">
              <Clock className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black">Grace Period</h3>
          </div>
          <div className="space-y-4">
            <input
              type="range"
              min={1}
              max={90}
              value={graceSliderDays}
              onChange={(e) => setGraceSeconds(Number(e.target.value) * SECONDS_PER_DAY)}
              className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-yellow"
            />
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {graceSeconds < SECONDS_PER_DAY ? "Seconds" : "Days"}
              </span>
              <span className="text-5xl font-black tabular-nums">
                {graceSeconds < SECONDS_PER_DAY ? graceSeconds : Math.round(graceSeconds / SECONDS_PER_DAY)}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {GRACE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setGraceSeconds(p.seconds)}
                  className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${
                    graceSeconds === p.seconds ? "bg-accent-yellow neo-shadow-sm" : "bg-secondary hover:bg-accent-yellow/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="neo-card-static">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-accent-purple neo-border rounded-xl p-3">
            <Shield className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black">Guardian Pause Window</h3>
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-3">
          How long a guardian can pause the claim once (0 = no guardian pause).
        </p>
        <div className="flex gap-2 flex-wrap">
          {PAUSE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPauseSeconds(p.seconds)}
              className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
                pauseSeconds === p.seconds ? "bg-accent-purple text-white neo-shadow-sm" : "bg-secondary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="neo-card-static bg-accent-lime/30 flex items-center gap-4">
        <div className="bg-accent-lime neo-border rounded-xl p-3 shrink-0">
          <Clock className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <p className="text-base font-bold leading-snug">
          Total deadline:{" "}
          <span className="text-xl font-black">
            {formatDuration(heartbeatSeconds + graceSeconds)}
          </span>
          {" "}— if you don't check in for this long, your heirs can claim.
        </p>
      </div>
    </div>
  );
};

export default HeartbeatStep;
