import { Heart, Clock, Users, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: ShieldCheck,
    title: "Create your Estate",
    description: "Connect your wallet, deposit tokens, and name your heirs with their percentage splits.",
    tile: "neo-section-yellow",
  },
  {
    icon: Heart,
    title: "Send heartbeats",
    description: "Periodically sign a one-click transaction. It proves you're alive and resets the timer.",
    tile: "bg-background",
  },
  {
    icon: Clock,
    title: "Grace period",
    description: "Miss a heartbeat and a configurable grace period gives you time to recover. Your guardian can pause it.",
    tile: "bg-secondary",
  },
  {
    icon: Users,
    title: "Heirs claim",
    description: "If your heartbeat stays silent, heirs claim their share in one click. Automatic. Trustless.",
    tile: "bg-background",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-1 border-4 border-foreground bg-foreground md:grid-cols-2 lg:grid-cols-12">
        {/* Heading cell */}
        <div className="flex flex-col justify-center bg-background p-8 md:col-span-2 md:p-10 lg:col-span-4 lg:row-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            How it works
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
            Four steps to
            <br />
            <span className="mt-1 inline-block bg-foreground px-3 text-background">
              immortal assets.
            </span>
          </h2>
          <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-muted-foreground">
            A vault with a pulse. Check in and nothing moves — you stay in full
            control. Go quiet, and it hands off on its own.
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
