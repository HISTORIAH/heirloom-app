import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gift, Heart, LayoutDashboard } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";

export const APP_DESTINATIONS = [
  { path: "/dashboard", labelKey: "nav.dashboard", Icon: LayoutDashboard },
  { path: "/claim", labelKey: "nav.claimInheritance", Icon: Gift },
  { path: "/heartbeat", labelKey: "nav.heartbeat", Icon: Heart },
] as const;

export const AppNavLinks: React.FC<{
  onNavigate?: () => void;
  variant?: "bar" | "drawer";
}> = ({ onNavigate, variant = "bar" }) => {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      {APP_DESTINATIONS.map(({ path, labelKey, Icon }) => {
        const active = pathname === path || pathname.startsWith(`${path}/`);
        return (
          <button
            key={path}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onNavigate?.();
              navigate(path);
            }}
            className={cn(
              variant === "drawer"
                ? "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
                : "flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-tile-soft",
              active && "bg-tile-soft",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {t(labelKey)}
          </button>
        );
      })}
    </>
  );
};
