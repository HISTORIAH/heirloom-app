import { Shield, Clock, Zap, Lock, FileCode, Layers } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

const WhySolanaSection = () => {
  const { t } = useTranslation("app");

  const reasons = [
    {
      icon: Zap,
      title: t("whySolana.r1Title"),
      description: t("whySolana.r1Desc"),
      badge: t("whySolana.r1Badge"),
      tile: "bg-background",
      dark: false,
    },
    {
      icon: Lock,
      title: t("whySolana.r2Title"),
      description: t("whySolana.r2Desc"),
      badge: t("whySolana.r2Badge"),
      tile: "bg-secondary",
      dark: false,
    },
    {
      icon: Clock,
      title: t("whySolana.r3Title"),
      description: t("whySolana.r3Desc"),
      badge: t("whySolana.r3Badge"),
      tile: "bg-background",
      dark: false,
    },
    {
      icon: Shield,
      title: t("whySolana.r4Title"),
      description: t("whySolana.r4Desc"),
      badge: t("whySolana.r4Badge"),
      tile: "bg-foreground",
      dark: true,
    },
    {
      icon: Layers,
      title: t("whySolana.r5Title"),
      description: t("whySolana.r5Desc"),
      badge: t("whySolana.r5Badge"),
      tile: "bg-secondary",
      dark: false,
    },
    {
      icon: FileCode,
      title: t("whySolana.r6Title"),
      description: t("whySolana.r6Desc"),
      badge: t("whySolana.r6Badge"),
      tile: "bg-background",
      dark: false,
    },
  ];

  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {t("whySolana.eyebrow")}
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            {t("whySolana.headline")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-1 border-4 border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <div
              key={r.title}
              className={`flex flex-col p-7 md:p-8 ${r.tile} ${r.dark ? "text-background" : ""}`}
            >
              <div className="flex items-center justify-between">
                <r.icon className="h-8 w-8" strokeWidth={2.5} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    r.dark ? "text-background/50" : "text-muted-foreground/60"
                  }`}
                >
                  {r.badge}
                </span>
              </div>
              <h3 className="mt-8 text-xl">{r.title}</h3>
              <p
                className={`mt-2 text-base font-medium leading-relaxed ${
                  r.dark ? "text-background/70" : "text-muted-foreground"
                }`}
              >
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySolanaSection;
