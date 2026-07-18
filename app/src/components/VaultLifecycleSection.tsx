import { ArrowRight, ShieldAlert, Heart, Clock, Gift, CheckCircle2, Plus } from "lucide-react";

const states = [
  { name: "CREATED", description: "Deposit tokens, define heirs", icon: Plus, color: "bg-secondary", textColor: "text-foreground" },
  { name: "ACTIVE", description: "Heartbeat timer running", icon: Heart, color: "bg-accent-lime", textColor: "text-foreground" },
  { name: "GRACE", description: "Missed heartbeat, countdown starts", icon: Clock, color: "bg-accent-yellow", textColor: "text-foreground" },
  { name: "CLAIMABLE", description: "Heirs can claim their share", icon: Gift, color: "bg-accent-orange", textColor: "text-foreground" },
  { name: "DISTRIBUTED", description: "All assets claimed, vault closed", icon: CheckCircle2, color: "bg-accent-pink", textColor: "text-foreground" },
];

const VaultLifecycleSection = () => {
  return (
    <section className="py-16 px-6 md:py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <span className="neo-badge bg-accent-orange mb-6 inline-block">Vault Lifecycle</span>
          <h2 className="text-4xl md:text-6xl font-normal leading-[0.9]">
            From heartbeat to{" "}
            <span className="bg-accent-cyan px-3 inline-block rotate-[1deg]">inheritance.</span>
          </h2>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden lg:block">
          <div className="flex items-start gap-0">
            {states.map((state, i) => (
              <div key={state.name} className="flex items-start flex-1 min-w-0">
                <div className="flex-1 min-w-0 group">
                  <div className="flex items-center mb-4">
                    <div className={`${state.color} neo-border rounded-xl p-3 shrink-0 z-10 transition-transform duration-150 group-hover:scale-110 group-hover:rotate-[-4deg]`}>
                      <state.icon className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    {i < states.length - 1 && (
                      <div className="flex-1 flex items-center -ml-1">
                        <div className="h-1 flex-1 bg-foreground rounded-full" />
                        <ArrowRight className="h-5 w-5 -ml-1 shrink-0" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="pr-4">
                    <h3 className="text-lg font-normal mb-1">{state.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-snug">{state.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: compact vertical */}
        <div className="lg:hidden">
          <div className="relative">
            <div className="absolute left-6 top-6 bottom-6 w-1 bg-foreground/20 rounded-full" />
            <div className="space-y-6">
              {states.map((state, i) => (
                <div key={state.name} className="flex items-start gap-5 relative">
                  <div className={`${state.color} neo-border rounded-xl p-2.5 shrink-0 z-10`}>
                    <state.icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-normal leading-tight">{state.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{state.description}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-muted-foreground/40 pt-1.5 shrink-0 tabular-nums">
                    {i + 1}/{states.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency note */}
        <div className="mt-12 neo-border-thick rounded-2xl p-6 bg-accent-red/10 flex items-center gap-4 max-w-3xl mx-auto">
          <div className="bg-accent-red neo-border rounded-xl p-3 shrink-0">
            <ShieldAlert className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-base font-bold">
            <span className="uppercase tracking-wide">Emergency Withdraw</span> -- The owner can reclaim all assets at any point before distribution. Always in control.
          </p>
        </div>
      </div>
    </section>
  );
};

export default VaultLifecycleSection;
