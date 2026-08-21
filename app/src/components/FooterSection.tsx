import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import { LanguageSwitcher, useTranslation } from "@heirloom/i18n";

// Light footer: the CTA above it is the page's one full ink block, and a
// second black mass underneath would swallow it.
const FooterSection = () => {
  const { t } = useTranslation("app");

  const linkGroups = [
    {
      heading: t("footer.protocol"),
      links: [
        { name: t("footer.documentation"), href: "https://docs.heirlm.xyz/" },
        { name: t("footer.github"), href: "https://github.com/HISTORIAH/Heirloom-app" },
      ],
    },
    {
      heading: t("footer.community"),
      links: [{ name: t("footer.twitter"), href: "https://x.com/heirloom_app" }],
    },
  ];

  return (
    <footer className="border-t border-tile-line pb-12 pt-16">
      <div className="section-inner">
        {/* Twelve columns, like the page above it: the mark holds the left
            half and the link columns stand against the right margin. */}
        <div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-6 lg:col-span-5">
            <h3>
              <Logo tone="ink" className="h-12 md:h-14" />
            </h3>
            <p className="ed-body mt-5 max-w-[42ch] text-muted-foreground">
              {t("footer.lede")}
            </p>
          </div>

          {linkGroups.map((group, i) => (
            <div
              key={group.heading}
              className={cn("md:col-span-3", i === 0 && "lg:col-start-8")}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {group.heading}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-base font-bold underline-offset-4 transition-colors hover:underline"
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-tile-line pt-7 md:flex-row md:items-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("footer.legalNote")}
          </p>
          <div className="flex items-center gap-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t("footer.poweredBy")}
            </p>
            <LanguageSwitcher
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              menuClassName="absolute right-0 bottom-full mb-2 w-44 rounded-none border border-tile-line bg-background p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] z-50"
              itemClassName="w-full rounded-none px-3 py-1.5 text-left text-sm font-medium normal-case tracking-normal text-muted-foreground transition-colors hover:bg-tile-soft hover:text-foreground"
              activeItemClassName="!text-foreground bg-tile-soft"
              globeClassName="h-4 w-4"
              chevronClassName="h-3.5 w-3.5 opacity-60"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
