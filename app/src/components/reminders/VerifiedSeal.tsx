import type { CSSProperties } from "react";

/** Twelve rays, alternating long and short, in the four accent colours. */
const RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30,
  long: i % 2 === 0,
  fill: ["bg-accent-yellow", "bg-foreground", "bg-accent-orange", "bg-accent-sky"][i % 4],
}));

/**
 * The "verified" moment: a lime seal springs in, the check draws itself, rays burst out and a
 * ring ripples away. Plays once on mount; reduced motion shows the finished seal.
 */
export default function VerifiedSeal() {
  return (
    <div role="img" aria-label="Verified" className="relative mx-auto h-[168px] w-[168px]">
      {RAYS.map((ray) => (
        <span
          key={ray.angle}
          aria-hidden
          style={{ "--angle": `${ray.angle}deg` } as CSSProperties}
          className={`seal-ray absolute left-1/2 top-1/2 -ml-[3px] w-[6px] rounded-full ${ray.fill} ${
            ray.long ? "-mt-[9px] h-[18px]" : "-mt-[6px] h-[12px]"
          }`}
        />
      ))}
      <span
        aria-hidden
        className="seal-ring absolute inset-[32px] rounded-full border-2 border-foreground"
      />
      <span className="seal-pop absolute inset-[32px] flex items-center justify-center rounded-full border-2 border-foreground bg-accent-lime">
        <svg viewBox="0 0 104 104" className="h-full w-full" aria-hidden>
          <path
            className="seal-check"
            d="M30 53 l14 14 l30 -32"
            fill="none"
            stroke="currentColor"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
