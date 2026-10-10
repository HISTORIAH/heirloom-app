import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";

/**
 * The app's two destinations. Check-in and guardian pause live on the estate itself, so
 * they are not here. `alsoActiveOn` keeps a tab lit on the routes that belong to it.
 */
const APP_DESTINATIONS = [
  { path: "/estates", labelKey: "nav.estates", alsoActiveOn: ["/create-vault"] },
  { path: "/inherit", labelKey: "nav.inherit", alsoActiveOn: [] },
] as const;

export const AppNavLinks: React.FC = () => {
  const { t } = useTranslation("app");
  const { pathname } = useLocation();

  return (
    <>
      {APP_DESTINATIONS.map(({ path, labelKey, alsoActiveOn }) => {
        const active = [path, ...alsoActiveOn].some(
          (route) => pathname === route || pathname.startsWith(`${route}/`),
        );
        return (
          <Link
            key={path}
            to={path}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-lg px-5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft",
              active ? "bg-tile-soft text-foreground" : "text-foreground/75",
            )}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </>
  );
};
