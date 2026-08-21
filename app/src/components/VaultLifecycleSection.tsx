import { ShieldAlert, Plus, Heart, Clock, Gift, CheckCircle2 } from "lucide-react";
import Section, { SectionLead, SectionNote } from "@/components/landing/Section";
import { useTranslation } from "@heirloom/i18n";

// The lifecycle is the one thing on this page that is a sequence, so it is
// drawn as one: five chips on a single axis, joined by an arrowed line, with
// the state under each. It was a stack of full-width bars (a row of progress
// bars, not a lifecycle) and then a three-by-two grid — which is the shape the
// why-Solana section already owns. A page should not say the same thing twice.
//
// The rail sits in an opaque ruled band so the page's own column rules stop at
// its edges: inside it, the five column dividers are the only vertical lines.
//
// Lime stays reserved for ACTIVE, and a closed vault reads as ink rather than
// one more colour.
const VaultLifecycleSection = () => {
  const { t } = useTranslation("app");

  const states: { name: string; desc: string; icon: typeof Plus; chip: string }[] = [
    { name: t("vaultLifecycle.stateCreated"), desc: t("vaultLifecycle.dCreated"), icon: Plus, chip: "bg-tile-soft" },
    { name: t("vaultLifecycle.stateActive"), desc: t("vaultLifecycle.dActive"), icon: Heart, chip: "bg-accent-lime" },
    { name: t("vaultLifecycle.stateGrace"), desc: t("vaultLifecycle.dGrace"), icon: Clock, chip: "bg-accent-yellow" },
    { name: t("vaultLifecycle.stateClaimable"), desc: t("vaultLifecycle.dClaimable"), icon: Gift, chip: "bg-accent-orange" },
    { name: t("vaultLifecycle.stateDistributed"), desc: t("vaultLifecycle.dDistributed"), icon: CheckCircle2, chip: "bg-foreground text-background" },
  ];

  return (
    <Section id="vault-lifecycle" index={6} total={10} label={t("vaultLifecycle.eyebrow")}>
      <SectionLead headline={t("vaultLifecycle.title")} lede={t("vaultLifecycle.lede")} />

      <div className="overflow-hidden rounded-xl border border-tile-line bg-background">
        <div className="grid grid-cols-1 divide-y divide-tile-line sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {states.map((s, i) => (
            <div
              key={s.name}
              // --rail-reach is the cell's own side padding, so the two rail
              // halves meet exactly on the divider between columns.
              style={{ "--rail-reach": "1.75rem" } as React.CSSProperties}
              className="flex flex-col px-6 py-9 sm:px-7 md:py-12 lg:px-7 xl:py-16 2xl:py-20"
            >
              <div className="flex items-center">
                {i > 0 ? (
                  <span aria-hidden="true" className="state-rail state-rail-in hidden lg:block" />
                ) : null}
                <span className={`state-chip ${s.chip}`}>
                  <s.icon className="h-1/2 w-1/2" strokeWidth={1.75} />
                </span>
                {i < states.length - 1 ? (
                  <span aria-hidden="true" className="state-rail state-rail-out hidden lg:block" />
                ) : null}
              </div>

              <h3 className="ed-h3 mt-10 uppercase">{s.name}</h3>
              {/* Two lines reserved, so one description that wraps does not
                  break the rhythm of the row it sits in. */}
              <p className="tile-body mt-3 min-h-[2.9em] max-w-[26ch] text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <SectionNote
        icon={ShieldAlert}
        label={t("vaultLifecycle.emergencyTitle")}
        className="!border-accent-red/40 bg-accent-red/[0.04] [&>svg]:text-accent-red"
      >
        {t("vaultLifecycle.emergencyLede")}
      </SectionNote>
    </Section>
  );
};

export default VaultLifecycleSection;
