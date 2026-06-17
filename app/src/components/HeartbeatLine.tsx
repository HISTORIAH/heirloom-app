import { cn } from "@/lib/utils";

// One ECG beat is BEAT_W wide at a FIXED pixel scale, so beat spacing looks
// identical in any container — wide hero or narrow monitor window. The strip
// renders N beats, is duplicated, and scrolled by -50% for a seamless loop.
// N is large enough that one period is wider than any container we clip it in.
const BEAT_W = 160;
const H = 120;
const BASE = 62;
const N = 16;

function buildBeats(): string {
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const o = i * BEAT_W;
    pts.push(
      `${o + 0},${BASE}`,
      `${o + 58},${BASE}`,
      `${o + 68},${BASE - 7}`, // P wave
      `${o + 78},${BASE}`,
      `${o + 92},${BASE}`,
      `${o + 98},${BASE + 12}`, // Q
      `${o + 104},${BASE - 46}`, // R spike
      `${o + 110},${BASE + 38}`, // S
      `${o + 116},${BASE}`,
      `${o + 126},${BASE}`,
      `${o + 136},${BASE - 17}`, // T wave
      `${o + 146},${BASE}`,
      `${o + 160},${BASE}`,
    );
  }
  return "M " + pts.join(" L ");
}

const BEAT_PATH = buildBeats();
const FLAT_PATH = `M 0,${BASE} L ${N * BEAT_W},${BASE}`;

interface HeartbeatLineProps {
  /** Stroke color. Defaults to the lime "alive" signal. */
  color?: string;
  /** Seconds per full loop. Lower = faster heart rate. */
  speed?: number;
  strokeWidth?: number;
  /** Soft glow under the trace. */
  glow?: boolean;
  /** Flatline — renders a straight line and stops scrolling (death state). */
  flat?: boolean;
  className?: string;
}

const HeartbeatLine = ({
  color = "hsl(var(--accent-lime))",
  speed = 7,
  strokeWidth = 2.5,
  glow = false,
  flat = false,
  className,
}: HeartbeatLineProps) => {
  const d = flat ? FLAT_PATH : BEAT_PATH;
  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden="true">
      <div
        className={cn("flex h-full", !flat && "ecg-track")}
        style={!flat ? { animationDuration: `${speed}s` } : undefined}
      >
        {[0, 1].map((k) => (
          <svg
            key={k}
            viewBox={`0 0 ${N * BEAT_W} ${H}`}
            preserveAspectRatio="none"
            className={cn("block h-full shrink-0", glow && "heartbeat-glow")}
            style={{ width: N * BEAT_W }}
          >
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ transition: "stroke 0.5s ease" }}
            />
          </svg>
        ))}
      </div>
    </div>
  );
};

export default HeartbeatLine;
