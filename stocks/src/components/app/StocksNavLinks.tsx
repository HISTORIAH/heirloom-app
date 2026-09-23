import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";

export const STOCKS_DESTINATIONS = [
  { path: "/portfolio", labelKey: "nav.portfolio" },
  { path: "/browse", labelKey: "nav.browse" },
  { path: "/protect", labelKey: "nav.protect" },
  { path: "/dashboard", labelKey: "nav.dashboard" },
  { path: "/recover", labelKey: "nav.recover" },
  { path: "/inherit", labelKey: "nav.inherit" },
] as const;

const linkClass = {
  bar: "hs-nav-link",
  // In the drawer each destination is a full-width row, big enough to thumb.
  drawer: "hs-nav-link h-12 w-full justify-between px-4 text-base",
};

/**
 * The app's destinations as quiet text links, the way the landing's nav
 * reads. NavLink sets aria-current on the active one, which is what the
 * stylesheet lights.
 */
export const StocksNavLinks: React.FC<{
  onNavigate?: () => void;
  variant?: "bar" | "drawer";
}> = ({ onNavigate, variant = "bar" }) => {
  const { t } = useTranslation("stocks");

  // The docs are linked from the footer rather than the bar.
  return (
    <>
      {STOCKS_DESTINATIONS.map(({ path, labelKey }) => (
        <NavLink key={path} to={path} onClick={onNavigate} className={linkClass[variant]}>
          {t(labelKey)}
        </NavLink>
      ))}
    </>
  );
};
