import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="neo-border rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left transition-colors duration-150 ${
        isOpen ? "bg-accent-lime/10" : "bg-background hover:bg-secondary/50"
      }`}
    >
      <span className="text-base md:text-lg font-black leading-tight">{question}</span>
      <ChevronDown
        className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        strokeWidth={3}
      />
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ease-out ${
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <p className="px-5 md:px-6 pb-5 md:pb-6 text-base font-medium text-muted-foreground leading-relaxed">
        {answer}
      </p>
    </div>
  </div>
);

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 px-6 md:py-24 lg:py-32 bg-accent-purple/10 border-y-8 border-foreground">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12 text-center">
          <span className="neo-badge bg-accent-purple mb-6 inline-block">FAQ</span>
          <h2 className="text-4xl md:text-6xl font-black leading-[0.9]">
            Common{" "}
            <span className="bg-accent-purple text-background px-3 inline-block rotate-[-1deg]">
              questions.
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
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
