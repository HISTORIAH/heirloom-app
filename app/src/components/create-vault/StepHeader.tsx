import { cn } from "@/lib/utils";

interface StepHeaderProps {
  cap: string;
  accent: string;
  title: string;
}

/** Cap + title for a wizard step. A colour swatch, not a bordered icon box. */
export const StepHeader: React.FC<StepHeaderProps> = ({ cap, accent, title }) => (
  <div className="mb-6">
    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", accent)} />
      {cap}
    </span>
    <h2 className="ed-h3 mt-2">{title}</h2>
  </div>
);
