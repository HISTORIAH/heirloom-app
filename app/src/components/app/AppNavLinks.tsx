import { Link, useLocation } from "react-router-dom";
import { Gift, LayoutDashboard } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";

/**
 * The app's two destinations. Check-in and guardian pause live on the estate itself, so
 * they are not here. `alsoActiveOn` keeps a tab lit on the routes that belong to it.
 */
const APP_DESTINATIONS = [
  { path: "/estates", labelKey: "nav.estates", icon: LayoutDashboard, alsoActiveOn: ["/create-vault"] },
  { path: "/inherit", labelKey: "nav.inherit", icon: Gift, alsoActiveOn: [] },
] as const;

type AppNavLinksProps = {
  /** "bar" is the desktop header's row of tabs; "drawer" is the mobile menu's full-width rows. */
  layout?: "bar" | "drawer";
  /** Called after a link is followed, so the drawer can close. */
  onNavigate?: () => void;
};

export const AppNavLinks: React.FC<AppNavLinksProps> = ({ layout = "bar", onNavigate }) => {
  const { t } = useTranslation("app");
  const { pathname } = useLocation();
  const inDrawer = layout === "drawer";

  return (
    <>
      {APP_DESTINATIONS.map(({ path, labelKey, icon: Icon, alsoActiveOn }) => {
        const active = [path, ...alsoActiveOn].some(
          (route) => pathname === route || pathname.startsWith(`${route}/`),
        );
        return (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-lg transition-colors hover:bg-tile-soft",
              inDrawer
                ? "w-full gap-3 px-3 text-sm font-semibold"
                : "px-5 text-xs font-bold uppercase tracking-[0.12em]",
              active ? "bg-tile-soft text-foreground" : "text-foreground/75",
            )}
          >
            {/* Icons only in the drawer: a vertical list scans faster with them, the bar does not need them. */}
            {inDrawer && <Icon aria-hidden="true" className="h-4 w-4" />}
            {t(labelKey)}
          </Link>
        );
      })}
    </>
  );
};
