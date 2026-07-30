import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "What happens if I lose access to my wallet?",
    answer:
      "If you cannot send heartbeats, the vault will naturally transition through the grace period and become claimable by your heirs. This is the intended behavior -- the vault interprets prolonged silence as incapacitation. If you have a guardian set, they can extend the grace period by 30 days to give you more time to recover access.",
  },
  {
    question: "Can I change my heirs after creating a vault?",
    answer:
      "Yes. As the vault owner, you can call update-heirs at any time while the vault is active. You can change addresses, adjust percentage splits, add or remove beneficiaries -- as long as the new splits sum to exactly 100%.",
  },
  {
    question: "What does a heartbeat cost?",
    answer:
      "A heartbeat costs only the standard Solana network transaction fee (typically a fraction of a cent). There is no protocol fee for sending heartbeats.",
  },
  {
    question: "What are the protocol fees?",
    answer:
      "Inheritance claims incur a 0.75% protocol fee, and emergency withdrawals incur a 0.5% fee. These fees are deducted automatically from the vault assets and sent to the protocol treasury. Heartbeats and vault creation have no protocol fee.",
  },
  {
    question: "Can my heirs claim early?",
    answer:
      "No. The claim function enforces that the full heartbeat interval plus the grace period must have elapsed. Until that deadline passes, the contract will reject any claim attempt. The vault state is computed from on-chain timestamps, so it cannot be spoofed.",
  },
  {
    question: "What is the guardian role?",
    answer:
      "A guardian is an optional trusted address you can designate when creating your vault. If your vault enters the grace period, the guardian can trigger a one-time pause that extends the deadline by 30 days. The guardian cannot withdraw funds, change heirs, or interact with the vault in any other way.",
  },
  {
    question: "What tokens can I deposit?",
    answer:
      "Heirloom supports any two SPL tokens configured at vault creation. Each heir receives their percentage share of both tokens when they claim.",
  },
  {
    question: "Is this a legal will?",
    answer:
      "No. Heirloom is a programmable self-custody continuity tool, not a legal document. It operates entirely on-chain through an Anchor program on Solana. It does not interact with any legal system or jurisdiction. Consider it a complement to -- not a replacement for -- traditional estate planning.",
  },
  {
    question: "Can I get my assets back after creating a vault?",
    answer:
      "Yes, at any time before the vault is fully distributed. The emergency-withdraw function returns all tokens to your wallet and permanently closes the vault. You retain full control for as long as the vault is active.",
  },
];

const FAQItem = ({
  index,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  index: number;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div
    className={`group relative border transition-colors duration-200 ${
      isOpen
        ? "border-foreground/40 bg-accent-purple/[0.06]"
        : "border-foreground/15 hover:border-foreground/40"
    }`}
  >
    {/* Corner tick — echoes the comparison cells. */}
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 top-0 h-3.5 w-3.5 border-l-2 border-t-2 ${
        isOpen ? "border-accent-purple/60" : "border-foreground/20"
      }`}
    />

    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-start gap-4 p-5 text-left md:p-6"
    >
      <span
        className={`w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums tracking-[0.2em] transition-colors ${
          isOpen ? "text-accent-purple" : "text-muted-foreground/60"
        }`}
      >
        0{index + 1}
      </span>
      <span className="flex-1 text-base font-bold leading-snug md:text-lg">{question}</span>
      <Plus
        className={`h-6 w-6 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
        strokeWidth={3}
      />
    </button>

    {/* 0fr → 1fr grid trick expands to the answer's real height, no clipping. */}
    <div
      className={`grid transition-all duration-300 ease-out ${
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <p className="pb-5 pl-[3.75rem] pr-5 text-base font-medium leading-relaxed text-muted-foreground md:pb-6 md:pl-16 md:pr-6">
          {answer}
        </p>
      </div>
    </div>
  </div>
);

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Heading — sits alongside the questions on desktop. */}
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            FAQ
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            Common{" "}
            <span className="bg-accent-purple px-2 text-background">questions.</span>
          </h2>
          <p className="mt-6 max-w-sm text-lg font-medium leading-relaxed text-muted-foreground">
            Everything you need to know about heartbeats, heirs, fees, and control.
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-3 lg:col-span-8">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              index={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
