import { Heart, Clock, Users, ShieldCheck } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

const HowItWorksSection = () => {
  const { t } = useTranslation("app");

  const steps = [
    {
      icon: ShieldCheck,
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Desc"),
      tile: "neo-section-yellow",
    },
    {
      icon: Heart,
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Desc"),
      tile: "bg-background",
    },
    {
      icon: Clock,
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Desc"),
      tile: "bg-secondary",
    },
    {
      icon: Users,
      title: t("howItWorks.step4Title"),
      description: t("howItWorks.step4Desc"),
      tile: "bg-background",
    },
  ];

  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-1 border-4 border-foreground bg-foreground md:grid-cols-2 lg:grid-cols-12">
        {/* Heading cell */}
        <div className="flex flex-col justify-center bg-background p-8 md:col-span-2 md:p-10 lg:col-span-4 lg:row-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {t("howItWorks.eyebrow")}
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
            {t("howItWorks.headline1")}
            <br />
            <span className="mt-1 inline-block bg-foreground px-3 text-background">
              {t("howItWorks.headline2")}
            </span>
          </h2>
          <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-muted-foreground">
            {t("howItWorks.description")}
          </p>
        </div>

        {/* Step cells */}
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`flex flex-col p-8 md:p-10 lg:col-span-4 ${step.tile}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-5xl font-bold tabular-nums leading-none">
                0{i + 1}
              </span>
              <step.icon className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <h3 className="mt-8 text-2xl leading-tight">{step.title}</h3>
            <p className="mt-2 text-base font-medium leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
