// The wordmark, set in the page's own display face instead of the logo SVG's
// outlined Archivo Black — at hero size the two faces read as two brands.
// The mark stands in for the H: two vault walls with the beat between them,
// drawn 0.7em tall, which is exactly Space Grotesk's cap height, and sat on
// the text baseline so it aligns with the letters as if it were one of them.
//
// Motion: every glyph clip-reveals up from the baseline once on mount, then on
// a 9s loop a lift travels across the word, one glyph at a time. Nothing else —
// no colour, no sweep. See .glyph-clip / .glyph-rise in index.css.
import { cn } from "@/lib/utils";
import VaultMark from "@/components/landing/VaultMark";

const LETTERS = "EIRLOOM".split("");

const RISE_LEAD_MS = 120;
const RISE_STEP_MS = 60;
const LIFT_LEAD_MS = 1800;
const LIFT_STEP_MS = 52;

/** Both animations on .glyph-rise, in the order the shorthand declares them. */
const delays = (i: number) =>
  `${RISE_LEAD_MS + i * RISE_STEP_MS}ms, ${LIFT_LEAD_MS + i * LIFT_STEP_MS}ms`;

const HeroWordmark = ({ className }: { className?: string }) => (
  <span
    role="img"
    aria-label="Heirloom"
    className={cn("inline-block", className)}
  >
    <span className="glyph-clip" style={{ marginRight: "0.03em" }}>
      <span className="glyph-rise" style={{ animationDelay: delays(0) }}>
        <VaultMark className="inline-block h-[0.7em] w-auto align-baseline" />
        {/* Zero-width space: gives the mark's line box the same strut as the
            letters', so the svg's baseline is their baseline. */}
        {"​"}
      </span>
    </span>
    {LETTERS.map((letter, i) => (
      <span key={i} className="glyph-clip">
        <span className="glyph-rise" style={{ animationDelay: delays(i + 1) }}>
          {letter}
        </span>
      </span>
    ))}
  </span>
);

export default HeroWordmark;
