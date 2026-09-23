import React from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Briefcase, Gift, LayoutDashboard, LifeBuoy, ShieldCheck } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { DOCS_URL } from "@/config";
import { cn } from "@/lib/utils";

export const STOCKS_DESTINATIONS = [
  { path: "/", labelKey: "nav.portfolio", Icon: Briefcase },
  { path: "/protect", labelKey: "nav.protect", Icon: ShieldCheck },
  { path: "/dashboard", labelKey: "nav.dashboard", Icon: LayoutDashboard },
  { path: "/recover", labelKey: "nav.recover", Icon: LifeBuoy },
  { path: "/inherit", labelKey: "nav.inherit", Icon: Gift },
] as const;

const linkClass = {
  bar: "flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-tile-soft",
  drawer:
    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors hover:bg-tile-soft",
};

/** The app's `AppNavLinks`, pointed at the stocks routes. */
export const StocksNavLinks: React.FC<{
  onNavigate?: () => void;
  variant?: "bar" | "drawer";
}> = ({ onNavigate, variant = "bar" }) => {
  const { t } = useTranslation("stocks");
  const { t: tApp } = useTranslation("app");

  return (
    <>
      {STOCKS_DESTINATIONS.map(({ path, labelKey, Icon }) => (
        <NavLink
          key={path}
          to={path}
          // The portfolio is the root, so it must match exactly or it would
          // stay highlighted on every other route.
          end={path === "/"}
          onClick={onNavigate}
          className={({ isActive }) => cn(linkClass[variant], isActive && "bg-tile-soft")}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
          {t(labelKey)}
        </NavLink>
      ))}

      {/* The docs are on the landing's origin, so this is an anchor rather
          than a router link. */}
      <a href={DOCS_URL} onClick={onNavigate} className={linkClass[variant]}>
        <BookOpen className="h-4 w-4" strokeWidth={2} />
        {tApp("nav.docs")}
      </a>
    </>
  );
};
