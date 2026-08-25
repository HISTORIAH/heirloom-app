import type { ReactNode } from "react";

/**
 * A wizard step opens the way a landing section does: a caption at the margin,
 * a rule running out to the right, and the question set as a headline under
 * it. Steps used to open on a coloured icon tile, which is why each one felt
 * like a different product.
 */
const StepHead = ({
  step,
  title,
  icon,
}: {
  step: string;
  title: string;
  icon: ReactNode;
}) => (
  <div className="mb-7">
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="cap">{step}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
    </div>
    <h3 className="ed-h3 mt-4">{title}</h3>
  </div>
);

export default StepHead;
