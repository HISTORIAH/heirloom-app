import { Heart, Clock, Users, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: ShieldCheck,
    title: "Create Your Vault",
    description: "Connect your wallet, deposit tokens, define your heirs and their percentage splits.",
    color: "bg-accent-lime",
    rotate: "rotate-[-1deg]",
  },
  {
    icon: Heart,
    title: "Send Heartbeats",
    description: "Periodically sign a simple transaction. One click proves you're alive. Timer resets.",
    color: "bg-accent-pink",
    rotate: "rotate-[1deg]",
  },
  {
    icon: Clock,
    title: "Grace Period",
    description: "Miss a heartbeat? A configurable grace period gives you time to recover. Your guardian can pause.",
    color: "bg-accent-cyan",
    rotate: "rotate-[-2deg]",
  },
  {
    icon: Users,
    title: "Heirs Claim",
    description: "If your heartbeat stays silent, heirs claim their share with one click. Automatic. Trustless.",
    color: "bg-accent-yellow",
    rotate: "rotate-[1deg]",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="neo-section-lime py-16 px-6 md:py-24 lg:py-32 border-y-8 border-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <span className="neo-badge bg-background mb-6 inline-block">How It Works</span>
          <h2 className="text-4xl md:text-6xl font-normal leading-[0.9]">
            Four steps to<br />
            <span className="bg-foreground text-background px-3 inline-block rotate-[-1deg] mt-2">
              immortal assets.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className={`neo-card ${step.rotate} transition-all duration-150`}>
              <div className="flex items-start gap-6">
                <div className="relative shrink-0">
                  <div className={`${step.color} neo-border rounded-2xl p-4`}>
                    <step.icon className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <span className="absolute -top-3 -left-3 bg-foreground text-background neo-border rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="text-2xl font-normal mb-2">{step.title}</h3>
                  <p className="text-lg font-medium leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
