import { useTranslation } from "@heirloom/i18n";
import { GITHUB_URL, SITE_URL, STOCKS_DOCS_URL, X_URL } from "@/components/landing/links";
import { Brand } from "./Brand";

/** The same footer under the landing and every app route. */
export const SiteFooter: React.FC = () => {
  const { t } = useTranslation("stocks");
  const links = [
    { href: SITE_URL, label: t("landing.footer.site") },
    { href: STOCKS_DOCS_URL, label: t("landing.footer.docs") },
    { href: X_URL, label: "X" },
    { href: GITHUB_URL, label: "GitHub" },
  ];

  return (
    <footer className="relative mt-auto border-t border-tile-line bg-tile-soft">
      <div className="hs-col flex flex-col gap-10 py-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div>
            <Brand className="inline-flex" />
            <p className="mt-3 max-w-[22rem] text-sm text-muted-foreground">
              {t("landing.footer.tagline")}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map(({ href, label }) => (
              <li key={href}>
                <a href={href} className="hs-link">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-tile-line pt-6 md:flex-row">
          <p className="hs-mono-xs text-muted-foreground">
            {t("landing.footer.rights", { year: new Date().getFullYear() })}
          </p>
          <p className="hs-mono-xs max-w-[40rem] text-muted-foreground md:text-right">
            {t("landing.footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
};
