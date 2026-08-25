import type { ReactNode } from "react";

/**
 * A portal screen opens the way a landing section does: headline, then the
 * lede under it at reading width. The two are stacked rather than set across
 * the page — inside a centred measure a seven-column headline would wrap to
 * three lines while the lede sat in a column of its own.
 */
const PortalLead = ({
  headline,
  lede,
  className,
}: {
  headline: ReactNode;
  lede?: ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <h1 className="ed-h2">{headline}</h1>
    {lede ? <p className="ed-lede mt-5 max-w-[52ch] text-muted-foreground">{lede}</p> : null}
  </div>
);

export default PortalLead;
