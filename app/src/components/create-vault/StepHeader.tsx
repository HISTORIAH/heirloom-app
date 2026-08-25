interface StepHeaderProps {
  cap: string;
  title: string;
}

/** Cap + title for a wizard step. */
export const StepHeader: React.FC<StepHeaderProps> = ({ cap, title }) => (
  <div className="mb-6">
    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {cap}
    </span>
    <h2 className="ed-h3 mt-2">{title}</h2>
  </div>
);
