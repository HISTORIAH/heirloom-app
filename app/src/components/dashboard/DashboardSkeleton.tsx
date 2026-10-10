import { Plus } from "lucide-react";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { DASHBOARD_CARD } from "@/components/dashboard/estateState";
import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

/** One shimmering placeholder. Size it like the content it stands in for. */
const Bone: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={cn("skeleton", className)} />
);

const TokenRowBone = () => (
  <div className="flex items-center justify-between rounded-xl border border-tile-line px-[18px] py-4">
    <div className="flex items-center gap-3.5">
      <Bone className="h-11 w-11 rounded-full" />
      <div className="space-y-2">
        <Bone className="h-4 w-28" />
        <Bone className="h-3 w-12" />
      </div>
    </div>
    <Bone className="h-4 w-16" />
  </div>
);

/** The running head while the wallet's estates are still loading. */
export const RunningHeadSkeleton = () => {
  const { t } = useTranslation("app");
  return (
    <div className="flex h-[3.75rem] items-center gap-[clamp(0.75rem,1.4vw,1.5rem)] border-b border-tile-line px-[var(--page-pad)]">
      <span className="text-[11px] font-bold uppercase leading-none tracking-[0.18em]">
        {t("dashboard.yourEstates")}
      </span>
      <Bone className="h-3.5 w-5" />
      <span aria-hidden="true" className="h-4 w-px bg-tile-line" />
      <Bone className="h-3.5 w-28" />
      <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
      <Button
        variant="flat-outline"
        size="sm"
        disabled
        className="shrink-0 border tracking-[0.12em]"
      >
        <Plus className="h-4 w-4" /> {t("dashboard.newEstate")}
      </Button>
    </div>
  );
};

/**
 * The dashboard grid in outline, drawn to the same sizes as the real panels so nothing
 * moves when the estate lands. The nav and the wallet stay real around it.
 */
export const DashboardSkeleton = () => {
  const { t } = useTranslation("app");
  return (
    <div aria-busy="true" className="space-y-5">
      <span role="status" className="sr-only">
        {t("dashboard.loadingVault")}
      </span>

      <div className="grid grid-cols-1 items-stretch gap-5 min-[860px]:grid-cols-[1.45fr_1fr]">
        <Panel bare className={cn("gap-7", DASHBOARD_CARD)}>
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            <div className="space-y-4">
              <Bone className="h-7 w-32 rounded-full" />
              <Bone className="h-16 w-64 rounded-xl" />
              <Bone className="h-[18px] w-80 max-w-full" />
            </div>
            <div className="space-y-2.5 sm:flex sm:flex-col sm:items-end">
              <Bone className="h-14 w-44 rounded-xl" />
              <Bone className="h-3 w-36" />
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5 border-t border-tile-line pt-6">
            <div className="flex gap-9">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2.5">
                  <Bone className="h-[4.5rem] w-24 rounded-xl" />
                  <Bone className="h-3.5 w-11" />
                </div>
              ))}
            </div>
            <div className="space-y-2.5 sm:flex sm:flex-col sm:items-end">
              <Bone className="h-3.5 w-32" />
              <Bone className="h-5 w-56" />
            </div>
          </div>
          <div className="grid gap-4 rounded-xl bg-tile-soft/50 px-[18px] py-4 sm:grid-cols-3">
            {["w-36", "w-20", "w-16"].map((width) => (
              <div key={width} className="space-y-2.5">
                <Bone className="h-3 w-20" />
                <Bone className={cn("h-4", width)} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel bare className={cn("gap-5", DASHBOARD_CARD)}>
          <Bone className="h-3 w-28" />
          <div className="space-y-3 rounded-xl border border-tile-line px-[18px] py-4">
            <Bone className="h-3 w-10" />
            <Bone className="h-[18px] w-36" />
            <Bone className="h-3 w-16" />
          </div>
          <div className="space-y-2.5">
            <Bone className="h-3 w-16" />
            <Bone className="h-4 w-28" />
          </div>
          <div className="space-y-2.5 border-t border-tile-line pt-5">
            <Bone className="h-3 w-24" />
            <Bone className="h-4 w-28" />
          </div>
        </Panel>

        <Panel bare className={cn("gap-5", DASHBOARD_CARD)}>
          <div className="flex items-center justify-between">
            <Bone className="h-3.5 w-36" />
            <Bone className="h-9 w-44 rounded-lg" />
          </div>
          <div className="space-y-2.5">
            <Bone className="h-3 w-24" />
            <Bone className="h-7 w-40" />
          </div>
          <TokenRowBone />
          <TokenRowBone />
        </Panel>

        <Panel bare className={cn("gap-3.5", DASHBOARD_CARD)}>
          <Bone className="h-3 w-32" />
          <Bone className="mt-1.5 h-3 w-24" />
          <div className="grid grid-cols-2 gap-2">
            <Bone className="h-11 rounded-lg" />
            <Bone className="h-11 rounded-lg" />
          </div>
          <Bone className="mt-2 h-3 w-16" />
          <Bone className="h-11 rounded-lg" />
          <Bone className="mt-2 h-3 w-24" />
          <Bone className="h-11 rounded-lg" />
        </Panel>

        <Panel
          bare
          className="col-span-full flex-row flex-wrap items-center justify-between gap-5 rounded-2xl px-5 py-6 sm:px-7"
        >
          <div className="flex items-center gap-4">
            <Bone className="h-11 w-11 rounded-xl" />
            <div className="space-y-2.5">
              <Bone className="h-5 w-36" />
              <Bone className="h-3.5 w-72 max-w-full" />
            </div>
          </div>
          <Bone className="h-12 w-44 rounded-lg" />
        </Panel>
      </div>
    </div>
  );
};
