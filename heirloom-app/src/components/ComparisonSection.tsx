import { Check, X } from "lucide-react";

const solutions = [
  { name: "Seed phrase in safe", selfCustodial: false, trustless: false, onChain: false },
  { name: "Casa inheritance", selfCustodial: "partial" as const, trustless: false, onChain: false },
  { name: "Sarcophagus (ETH)", selfCustodial: true, trustless: true, onChain: false },
  { name: "Safe Haven", selfCustodial: "partial" as const, trustless: "partial" as const, onChain: false },
  { name: "Heirloom", selfCustodial: true, trustless: true, onChain: true, highlight: true },
];

const Cell = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Check className="h-7 w-7 mx-auto text-foreground" strokeWidth={3} />;
  if (value === false) return <X className="h-7 w-7 mx-auto text-muted-foreground/40" strokeWidth={3} />;
  return <span className="text-sm font-bold uppercase text-muted-foreground">Partial</span>;
};

const ComparisonSection = () => {
  return (
    <section className="py-16 px-6 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <span className="neo-badge bg-accent-pink mb-6 inline-block">Comparison</span>
          <h2 className="text-4xl md:text-6xl font-black leading-[0.9]">
            Nothing else{" "}
            <span className="bg-accent-yellow px-3 inline-block rotate-[-1deg]">comes close.</span>
          </h2>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full neo-border-thick rounded-2xl overflow-hidden neo-shadow-lg">
            <thead>
              <tr className="bg-foreground text-background">
                <th className="text-left p-4 md:p-6 text-lg font-black uppercase tracking-wide border-r-4 border-background">Solution</th>
                <th className="p-4 md:p-6 text-lg font-black uppercase tracking-wide border-r-4 border-background text-center">Self-Custodial</th>
                <th className="p-4 md:p-6 text-lg font-black uppercase tracking-wide border-r-4 border-background text-center">Trustless</th>
                <th className="p-4 md:p-6 text-lg font-black uppercase tracking-wide text-center">On-Chain</th>
              </tr>
            </thead>
            <tbody>
              {solutions.map((s, i) => (
                <tr
                  key={s.name}
                  className={`${
                    s.highlight ? "bg-accent-lime font-black" : i % 2 === 0 ? "bg-background" : "bg-secondary"
                  } border-t-4 border-foreground transition-colors duration-150 ${!s.highlight ? "hover:bg-secondary/80" : ""}`}
                >
                  <td className="p-4 md:p-6 text-lg font-bold border-r-4 border-foreground">
                    {s.highlight ? (
                      <span className="flex items-center gap-2">
                        <span className="bg-foreground text-accent-lime rounded-md px-2 py-0.5 text-xs font-black uppercase tracking-wider">Best</span>
                        {s.name}
                      </span>
                    ) : s.name}
                  </td>
                  <td className="p-4 md:p-6 text-center border-r-4 border-foreground"><Cell value={s.selfCustodial} /></td>
                  <td className="p-4 md:p-6 text-center border-r-4 border-foreground"><Cell value={s.trustless} /></td>
                  <td className="p-4 md:p-6 text-center"><Cell value={s.onChain} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
