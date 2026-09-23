import type { CSSProperties, ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Info, TriangleAlert } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { DitherField } from "@/components/landing/DitherField";
import { useConnect } from "@/contexts/PageSession";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A titled block of a page, the landing's section head at app scale. */
export const Section: React.FC<{
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}> = ({ title, description, action, className, children }) => (
  <section className={cn("space-y-5", className)}>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[40rem]">
        <h2 className="hs-h3">{title}</h2>
        {description && (
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
    {children}
  </section>
);

/** A row of figures, as the landing's fact cards. */
export const Stats: React.FC<{ className?: string; children: ReactNode }> = ({
  className,
  children,
}) => <dl className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</dl>;

/** One labelled figure. */
export const Stat: React.FC<{ cap: string; value: ReactNode; note?: ReactNode }> = ({
  cap,
  value,
  note,
}) => (
  <div className="hs-card flex min-h-[8.5rem] flex-col justify-between gap-6 p-5 md:p-6">
    <dt className="hs-mono text-foreground/70">{cap}</dt>
    <dd>
      <p className="hs-figure">{value}</p>
      {note && <p className="mt-2 text-sm">{note}</p>}
    </dd>
  </div>
);

/**
 * Nothing here yet, and the way forward: the landing's closing card, with its
 * flare of dithered ink on the right.
 */
export const EmptyState: React.FC<{
  title: string;
  description: ReactNode;
  children?: ReactNode;
}> = ({ title, description, children }) => (
  <div className="hs-card relative overflow-hidden">
    <div className="absolute inset-y-0 right-0 hidden w-1/2 [mask-image:linear-gradient(90deg,transparent,#000_55%)] md:block">
      <DitherField shape="flare" className="text-foreground/25" />
    </div>
    <div className="relative flex min-h-[16rem] max-w-[36rem] flex-col justify-center px-6 py-10 md:px-10">
      <h2 className="hs-h3">{title}</h2>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-foreground/75">{description}</p>
      {children && <div className="mt-7 flex flex-wrap gap-2.5">{children}</div>}
    </div>
  </div>
);

/** A note that sits above content: the network, a caveat, a warning. */
export const Notice: React.FC<{
  tone?: "info" | "warn";
  title?: string;
  className?: string;
  children: ReactNode;
}> = ({ tone = "info", title, className, children }) => {
  const Icon = tone === "warn" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3.5",
        tone === "warn" ? "hs-fill-alert border-accent-yellow" : "border-tile-line bg-tile-soft",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-sm leading-relaxed">
        {title && <p className="font-medium">{title}</p>}
        <div className={cn(title && "mt-0.5", "text-foreground/75")}>{children}</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ lists

/**
 * A sheet of rows under a column header. `cols` is the grid template the
 * header and every row share; below md the header hides and rows stack.
 */
export const List: React.FC<{
  cols: string;
  head?: ReactNode[];
  className?: string;
  children: ReactNode;
}> = ({ cols, head, className, children }) => (
  <div className={cn("hs-list", className)} style={{ "--cols": cols } as CSSProperties}>
    {head && (
      <div className="hs-list-head" aria-hidden="true">
        {head.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    )}
    {children}
  </div>
);

export const Row: React.FC<{ className?: string; children: ReactNode }> = ({
  className,
  children,
}) => <div className={cn("hs-list-row", className)}>{children}</div>;

/** A cell with its column's name, which shows only while rows are stacked. */
export const Cell: React.FC<{ label?: string; className?: string; children: ReactNode }> = ({
  label,
  className,
  children,
}) => (
  <div className={cn("min-w-0", className)}>
    {label && <p className="hs-cell-label mb-1">{label}</p>}
    {children}
  </div>
);

/**
 * A list's only row while no wallet is connected: what would be here, and the
 * way to fill it. The list keeps its header, so the page still shows its shape.
 */
export const ConnectRow: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation("app");
  const connect = useConnect();
  return (
    <div className="hs-list-row md:!flex md:!flex-row md:items-center md:justify-between">
      <p className="text-[0.9375rem] text-muted-foreground">{children}</p>
      <div>
        <Button variant="ghost" size="sm" onClick={connect}>
          {t("common.connectWallet")}
        </Button>
      </div>
    </div>
  );
};

/** Where a list will be: grey rows in the list's own sheet. */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="hs-list" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="hs-list-row md:!flex md:!flex-row md:items-center">
        <span className="hs-skel h-10 w-10 shrink-0 !rounded-full" />
        <div className="flex-1 space-y-2">
          <span className="hs-skel h-3.5 w-28" />
          <span className="hs-skel h-3 w-44" />
        </div>
        <span className="hs-skel hidden h-8 w-24 !rounded-full md:block" />
      </div>
    ))}
  </div>
);

/**
 * Renders a query's data, or its loading and error states. Loading draws the
 * shape of what is coming rather than a word.
 */
export function QueryState<T>({
  query,
  loading,
  children,
}: {
  query: UseQueryResult<T>;
  loading?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation("stocks");
  if (query.isPending) {
    return (
      <div role="status" aria-label={t("common.loading")}>
        {loading ?? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="hs-skel h-[8.5rem] !rounded-[var(--hs-radius)]" />
              ))}
            </div>
            <ListSkeleton />
          </div>
        )}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="hs-sheet flex max-w-xl flex-col items-start gap-4 border-[hsl(var(--accent-red)/0.4)] p-6">
        <p className="font-medium">{t("common.loadFailed")}</p>
        <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  return <div className="hs-rise">{children(query.data)}</div>;
}

/** A token amount, with Max sitting inside the field. */
export const AmountInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onMax: () => void;
  className?: string;
}> = ({ id, label, value, onChange, onMax, className }) => {
  const { t } = useTranslation("stocks");
  return (
    <div className={cn("relative w-full sm:w-56", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        placeholder="0.0"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hs-input pr-20 tabular-nums"
      />
      <button
        type="button"
        onClick={onMax}
        className="hs-mono-xs absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-full bg-tile-soft px-3 transition-colors duration-100 ease-out hover:bg-tile-line"
      >
        {t("common.max")}
      </button>
    </div>
  );
};
