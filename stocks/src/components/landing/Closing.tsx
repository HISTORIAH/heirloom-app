import { Link } from "react-router-dom";
import { BookOpen, Github } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { DitherField } from "./DitherField";
import { MarkTile } from "./Primitives";
import { GITHUB_URL, SITE_URL, STOCKS_DOCS_URL, X_URL } from "./links";

/** X's mark, which lucide doesn't carry. */
const XLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
  </svg>
);

/** The sign-off card: where to find the team, over a flare of dithered ink. */
export const Closing: React.FC = () => {
  const { t } = useTranslation("stocks");
  const links = [
    { href: X_URL, label: t("landing.closing.x"), Icon: XLogo },
    { href: GITHUB_URL, label: t("landing.closing.github"), Icon: Github },
    { href: STOCKS_DOCS_URL, label: t("landing.closing.docs"), Icon: BookOpen },
  ];

  return (
    <section className="lp-col">
      <div className="lp-card relative overflow-hidden">
        {/* Faded in from the left so the dots never sit under the copy. A phone
            has no room beside the copy for it, so it goes. */}
        <div className="absolute inset-y-0 right-0 hidden w-2/3 [mask-image:linear-gradient(90deg,transparent,#000_45%)] md:block">
          <DitherField shape="flare" className="text-foreground/30" />
        </div>
        <div className="relative flex min-h-[20rem] flex-col justify-center px-6 py-12 md:min-h-[24rem] md:px-14">
          <h2 className="lp-h2">{t("landing.closing.title")}</h2>
          <p className="mt-5 max-w-[30rem] text-[0.975rem] leading-relaxed text-foreground/80">
            {t("landing.closing.body")}
          </p>
          <ul className="mt-8 flex gap-2">
            {links.map(({ href, label, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  aria-label={label}
                  title={label}
                  className="grid h-11 w-11 place-items-center rounded-full transition-colors duration-100 ease-out hover:bg-background"
                  {...(href.startsWith(SITE_URL) ? {} : { target: "_blank", rel: "noreferrer" })}
                >
                  <Icon className="h-5 w-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation("stocks");
  const links = [
    { href: SITE_URL, label: t("landing.footer.site") },
    { href: STOCKS_DOCS_URL, label: t("landing.footer.docs") },
    { href: X_URL, label: "X" },
    { href: GITHUB_URL, label: "GitHub" },
  ];

  return (
    <footer className="relative border-t border-tile-line bg-tile-soft">
      <div className="lp-col flex flex-col gap-10 py-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg">
              <MarkTile className="h-7 w-7" />
              <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">
                Heirloom <span className="font-normal text-muted-foreground">Stocks</span>
              </span>
            </Link>
            <p className="mt-3 max-w-[22rem] text-sm text-muted-foreground">
              {t("landing.footer.tagline")}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map(({ href, label }) => (
              <li key={href}>
                <a href={href} className="lp-link">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-tile-line pt-6 md:flex-row">
          <p className="lp-mono-xs text-muted-foreground">
            {t("landing.footer.rights", { year: new Date().getFullYear() })}
          </p>
          <p className="lp-mono-xs max-w-[40rem] text-muted-foreground md:text-right">
            {t("landing.footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
};
