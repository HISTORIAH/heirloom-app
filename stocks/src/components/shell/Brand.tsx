import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MarkTile } from "@/components/landing/Primitives";

/**
 * The yellow tile and the typeset name, linking home to the landing. The name
 * is the link's accessible name; an aria-label saying "Stocks" again would
 * also answer every getByLabel("Stock") in the end-to-end suite.
 */
export const Brand: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Link to="/" className={cn("flex shrink-0 items-center gap-2.5 rounded-lg", className)}>
      <MarkTile className="h-7 w-7" />
      <span className="whitespace-nowrap text-[1.0625rem] font-semibold tracking-[-0.02em]">
        Heirloom <span className="font-normal text-muted-foreground">Stocks</span>
      </span>
    </Link>
  );
};
