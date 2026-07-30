import { ArrowRight } from "lucide-react";

// The gravity section — the one place that names the problem before the
// product answers it. Built as bold, flat grid cells; no motifs, no clutter.
const ProblemSection = () => {
  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-1 border-4 border-foreground bg-foreground lg:grid-cols-12">
        {/* The statement */}
        <div className="bg-foreground p-8 text-background md:p-12 lg:col-span-7 lg:row-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent-red">
            The problem
          </span>
          <h2 className="mt-6 font-display text-4xl leading-[0.98] tracking-tight md:text-6xl">
            If you&apos;re gone, your{" "}
            <span className="bg-accent-red px-2 text-background">keys</span> are gone.
          </h2>
          <p className="mt-8 max-w-lg text-lg font-medium leading-relaxed text-background/70 md:text-xl">
            Self-custody has a fatal flaw. Hold your own keys and one hard truth
            follows: lose them, and no one can hand your assets on for you.
          </p>
        </div>

        {/* The consequences */}
        <div className="neo-section-orange flex flex-col justify-center p-8 md:p-10 lg:col-span-5">
          <ul className="font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl">
            <li>No bank to call.</li>
            <li>No password reset.</li>
            <li>No next of kin.</li>
          </ul>
        </div>

        {/* The turn */}
        <div className="flex flex-col justify-between gap-6 bg-secondary p-8 md:p-10 lg:col-span-5">
          <p className="text-base font-medium leading-relaxed text-muted-foreground">
            Fortunes in crypto are already lost forever — sealed behind keys no one
            else will ever hold.
          </p>
          <a
            href="#how-it-works"
            className="group inline-flex items-center gap-2 font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl"
          >
            That&apos;s the gap{" "}
            <span className="bg-accent-lime px-2">Heirloom</span> closes
            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
