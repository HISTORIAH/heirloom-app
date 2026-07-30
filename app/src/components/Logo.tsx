import { cn } from "@/lib/utils";
import wordmarkInk from "@/assets/heirloom-wordmark.svg";
import wordmarkPaper from "@/assets/heirloom-wordmark-inverse.svg";

interface LogoProps {
  /**
   * "ink" for light grounds — all-black, since a yellow waveline is only
   * 1.4:1 on white. "paper" for dark grounds — white type, yellow waveline.
   */
  tone?: "ink" | "paper";
  /** Set the height here (e.g. "h-10"); width follows the 391:120 ratio. */
  className?: string;
}

// The wordmark's H is the vault — two walls with the heartbeat running between
// them. Type is outlined, so it needs no webfont and can never fall back.
const Logo = ({ tone = "ink", className }: LogoProps) => (
  <img
    src={tone === "paper" ? wordmarkPaper : wordmarkInk}
    alt="Heirloom"
    width={391}
    height={120}
    className={cn("w-auto", className)}
  />
);

export default Logo;
