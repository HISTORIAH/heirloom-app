import { Shield, Clock, Zap, Lock, FileCode, Layers } from "lucide-react";

const reasons = [
  {
    icon: Zap,
    title: "Sub-Second Finality",
    description: "Solana confirms transactions in ~400ms. Heartbeats resolve instantly, claims settle in seconds.",
    badge: "FAST",
    badgeColor: "bg-accent-lime",
    rotate: "rotate-[-1deg]",
  },
  {
    icon: Lock,
    title: "Program-Level Security",
    description: "Anchor ensures type safety, account validation, and constraint checking at compile time.",
    badge: "SAFE",
    badgeColor: "bg-accent-cyan",
    rotate: "rotate-[1deg]",
  },
  {
    icon: Clock,
    title: "On-Chain Clock",
    description: "Solana's Clock sysvar provides accurate timestamps for heartbeat intervals and expiry calculations.",
    badge: "PRECISE",
    badgeColor: "bg-accent-yellow",
    rotate: "rotate-[-0.5deg]",
  },
  {
    icon: Layers,
    title: "SPL Token Standard ",
    description: "Standard token interface for composable, programmable inheritance of any SPL token pair.",
    badge: "SPL",
    badgeColor: "bg-accent-pink",
    rotate: "rotate-[1.5deg]",
  },
  {
    icon: Shield,
    title: "PDA Vaults",
    description: "Program Derived Addresses ensure only the program controls vault funds. No private key custody.",
    badge: "TRUSTLESS",
    badgeColor: "bg-accent-orange",
    rotate: "rotate-[-1.5deg]",
  },
  {
    icon: FileCode,
    title: "Anchor Framework",
    description: "Battle-tested account validation, constraint macros, and best-in-class developer tooling for fast, safe iteration.",
    badge: "EFFICIENT",
    badgeColor: "bg-accent-purple",
    rotate: "rotate-[0.5deg]",
  },
];

const WhySolanaSection = () => {
  return (
    <section className="neo-section-cyan py-16 px-6 md:py-24 lg:py-32 border-y-8 border-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <span className="neo-badge bg-background mb-6 inline-block">Why Solana</span>
          <h2 className="text-4xl md:text-6xl font-black leading-[0.9]">
            Built where speed{" "}
            <span className="bg-foreground text-accent-cyan px-3 inline-block rotate-[1deg]">
              meets safety.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((r) => (
            <div key={r.title} className={`neo-card relative ${r.rotate}`}>
              <span className={`absolute -top-3 -right-3 neo-badge ${r.badgeColor} rotate-[6deg] text-xs`}>
                {r.badge}
              </span>
              <div className={`${r.badgeColor} neo-border rounded-xl p-3 inline-block mb-4`}>
                <r.icon className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black mb-2">{r.title}</h3>
              <p className="text-base font-medium leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySolanaSection;
