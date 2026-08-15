import Logo from "@/components/Logo";
import { useTranslation } from "@heirloom/i18n";

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
    <footer className="bg-foreground px-6 pb-12 pt-16 text-background md:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <h3>
              <Logo tone="paper" className="h-16 md:h-20" />
            </h3>
            <p className="mt-4 max-w-sm text-lg font-medium leading-relaxed text-background/70">
              {t("footer.description")}
            </p>
          </div>

          {linkGroups.map((group) => (
            <div key={group.heading}>
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-background/50">
                {group.heading}
              </h4>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-lg font-bold underline-offset-4 transition-colors hover:text-accent-yellow hover:underline"
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

        <div className="flex flex-col items-start justify-between gap-4 border-t-2 border-background/20 pt-8 md:flex-row md:items-center">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-background/50">
            {t("footer.legalNote")}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-background/50">
            {t("footer.poweredBy")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
