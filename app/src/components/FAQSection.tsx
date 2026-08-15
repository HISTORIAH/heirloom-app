import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

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
  const { t } = useTranslation("app");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
    { question: t("faq.q5"), answer: t("faq.a5") },
    { question: t("faq.q6"), answer: t("faq.a6") },
    { question: t("faq.q7"), answer: t("faq.a7") },
    { question: t("faq.q8"), answer: t("faq.a8") },
    { question: t("faq.q9"), answer: t("faq.a9") },
  ];

  return (
    <section className="bg-background px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Heading — sits alongside the questions on desktop. */}
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {t("faq.eyebrow")}
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            {t("faq.headline1")}{" "}
            <span className="bg-accent-purple px-2 text-background">{t("faq.headline2")}</span>
          </h2>
          <p className="mt-6 max-w-sm text-lg font-medium leading-relaxed text-muted-foreground">
            {t("faq.description")}
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
