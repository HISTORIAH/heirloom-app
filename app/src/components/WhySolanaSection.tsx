import { Shield, Clock, Zap, Lock, FileCode, Layers } from "lucide-react";

const reasons = [
  {
    icon: Zap,
    title: "Sub-second finality",
    description: "Solana confirms in ~400ms. Heartbeats resolve instantly, claims settle in seconds.",
    badge: "FAST",
    tile: "bg-background",
    dark: false,
  },
  {
    icon: Lock,
    title: "Program-level security",
    description: "Anchor enforces type safety, account validation, and constraint checks at compile time.",
    badge: "SAFE",
    tile: "bg-secondary",
    dark: false,
  },
  {
    icon: Clock,
    title: "On-chain clock",
    description: "Solana's Clock sysvar gives accurate timestamps for heartbeat intervals and expiry.",
    badge: "PRECISE",
    tile: "bg-background",
    dark: false,
  },
  {
    icon: Shield,
    title: "PDA vaults",
    description: "Program Derived Addresses mean only the program controls vault funds. No key custody.",
    badge: "TRUSTLESS",
    tile: "bg-foreground",
    dark: true,
  },
  {
    icon: Layers,
    title: "SPL token standard",
    description: "A standard token interface for composable, programmable inheritance of any SPL pair.",
    badge: "SPL",
    tile: "bg-secondary",
    dark: false,
  },
  {
    icon: FileCode,
    title: "Anchor framework",
    description: "Battle-tested account validation and constraint macros for fast, safe iteration.",
    badge: "EFFICIENT",
    tile: "bg-background",
    dark: false,
  },
];

const WhySolanaSection = () => {
  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Why Solana
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            Built where speed meets safety.
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
