import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";

const ROUTES = [
  { key: "browse", to: "/browse" },
  { key: "protect", to: "/protect" },
  { key: "inherit", to: "/inherit" },
  { key: "recover", to: "/recover" },
] as const;

/**
 * Four ways into the app, one per quarter of the column, so the page's own
 * rules divide them. Each cell is a single link: the whole cell is the target.
 */
export const OpenApp: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <section className="hs-col">
      <h2 className="hs-h2">{t("landing.open.title")}</h2>
      <ul className="mt-8 grid grid-cols-2 border-y border-tile-line md:grid-cols-4">
        {ROUTES.map(({ key, to }, i) => (
          <li
            key={key}
            className={cn(
              // Two rows on a phone: the second row needs its own top rule.
              i >= 2 && "border-t border-tile-line md:border-t-0",
            )}
          >
            <Link
              to={to}
              className="group flex h-full flex-col transition-colors duration-100 ease-out hover:bg-tile-soft/60"
            >
              <span className="flex min-h-[10rem] flex-1 flex-col justify-between gap-6 p-4 sm:p-5 md:min-h-[13.5rem] md:gap-8">
                <span className="hs-h3">{t(`landing.open.${key}.title`)}</span>
                <span className="hs-mono text-foreground/75">{t(`landing.open.${key}.body`)}</span>
              </span>
              {/* Filled, so it hides the page rules; it draws its own dividers. */}
              <span
                className={cn(
                  "flex items-center gap-1 border-r border-t border-tile-line bg-tile-soft px-4 py-3.5 text-sm text-foreground/80 group-hover:text-foreground sm:px-5",
                  i % 2 === 0 && "border-l",
                  i === 2 && "md:border-l-0",
                )}
              >
                {t(`landing.open.${key}.cta`)}
                <ChevronRight
                  className="h-3.5 w-3.5 transition-transform duration-100 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
