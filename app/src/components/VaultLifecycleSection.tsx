import { ShieldAlert, Plus, Heart, Clock, Gift, CheckCircle2 } from "lucide-react";

const states = [
  { name: "CREATED", description: "Deposit tokens, name heirs", icon: Plus, tile: "bg-secondary" },
  { name: "ACTIVE", description: "Heartbeat timer running", icon: Heart, tile: "bg-accent-lime" },
  { name: "GRACE", description: "Missed heartbeat, countdown", icon: Clock, tile: "bg-accent-yellow" },
  { name: "CLAIMABLE", description: "Heirs can claim their share", icon: Gift, tile: "bg-accent-orange" },
  { name: "DISTRIBUTED", description: "All claimed, vault closed", icon: CheckCircle2, tile: "bg-accent-pink" },
];

const VaultLifecycleSection = () => {
  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Vault lifecycle
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            From heartbeat to inheritance.
          </h2>
          <p className="mt-6 text-lg font-medium leading-relaxed text-muted-foreground">
            Five on-chain states, one direction. While it&apos;s active you&apos;re in
            control; once the deadline passes, the vault does exactly what you told it
            to.
          </p>
        </div>

        {/* The five states as a modular color band. */}
        <div className="grid grid-cols-2 gap-1 border-4 border-foreground bg-foreground sm:grid-cols-3 lg:grid-cols-5">
          {states.map((state, i) => (
            <div key={state.name} className={`flex flex-col p-6 ${state.tile}`}>
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-bold tabular-nums leading-none">
                  0{i + 1}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-background">
                  <state.icon className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </div>
              <h3 className="mt-6 text-base font-bold tracking-tight">{state.name}</h3>
              <p className="mt-1 text-sm font-medium leading-snug text-foreground/70">
                {state.description}
              </p>
            </div>
          ))}
        </div>

        {/* Owner is always in control. */}
        <div className="mt-6 flex items-center gap-4 border-4 border-foreground bg-accent-red/10 p-5 md:p-6">
          <div className="shrink-0 rounded-xl border-4 border-foreground bg-accent-red p-3">
            <ShieldAlert className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-base font-bold leading-snug">
            <span className="uppercase tracking-wide">Emergency withdraw</span> — the
            owner can reclaim every asset at any point before distribution. Always in
            control.
          </p>
        </div>
      </div>
    </section>
  );
};

export default VaultLifecycleSection;
