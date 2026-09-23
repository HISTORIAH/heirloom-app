import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "@heirloom/i18n";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A titled block of a page. */
export const Section: React.FC<{
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}> = ({ title, description, action, className, children }) => (
  <section className={cn("space-y-4", className)}>
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h2 className="ed-h3">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

/** A small labelled figure, for summary bands. */
export const Figure: React.FC<{ cap: string; value: ReactNode; note?: ReactNode }> = ({
  cap,
  value,
  note,
}) => (
  <Panel tone="paper" className="gap-2">
    <PanelCap className="text-muted-foreground">{cap}</PanelCap>
    <p className="tile-h">{value}</p>
    {note && <p className="text-sm font-semibold">{note}</p>}
  </Panel>
);

/** A panel explaining that there is nothing here yet, with a way forward. */
export const EmptyState: React.FC<{
  title: string;
  description: ReactNode;
  children?: ReactNode;
}> = ({ title, description, children }) => (
  <Panel tone="soft" className="max-w-2xl gap-3">
    <h2 className="ed-h3">{title}</h2>
    <p className="ed-body text-muted-foreground">{description}</p>
    {children && <div className="mt-2 flex flex-wrap gap-3">{children}</div>}
  </Panel>
);

/** Renders a query's data, or its loading and error states. */
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation("stocks");
  if (query.isPending) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }
  if (query.isError) {
    return (
      <Panel tone="red-line" className="max-w-xl gap-3">
        <p className="font-semibold">{t("common.loadFailed")}</p>
        <Button
          variant="flat-outline"
          size="sm"
          className="self-start"
          onClick={() => query.refetch()}
        >
          {t("common.retry")}
        </Button>
      </Panel>
    );
  }
  return <>{children(query.data)}</>;
}

/** A numeric input with a Max control, for token amounts. */
export const AmountInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onMax: () => void;
}> = ({ id, label, value, onChange, onMax }) => {
  const { t } = useTranslation("stocks");
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        placeholder="0.0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ed-input w-36"
      />
      <Button type="button" variant="flat-outline" size="sm" onClick={onMax}>
        {t("common.max")}
      </Button>
    </div>
  );
};
