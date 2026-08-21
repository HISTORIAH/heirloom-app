import { useState } from "react";
import { Plus } from "lucide-react";
import Section from "@/components/landing/Section";
import { useTranslation } from "@heirloom/i18n";

// The one section that isn't a mosaic: a stack of questions reads better than
// a grid of them. It borrows the tile language — hairline borders, square
// corners, the same caps — so it still belongs to the page.
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
    className={`rounded-xl border transition-colors duration-200 ${
      isOpen
        ? "border-foreground/35 bg-tile-soft"
        : "border-tile-line bg-background hover:border-foreground/25"
    }`}
  >
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center gap-5 p-5 text-left md:px-7 md:py-6"
    >
      <span className="w-7 shrink-0 text-xs font-bold tabular-nums tracking-[0.16em] text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="ed-h3 flex-1 pr-4">{question}</span>
      <Plus
        className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
        strokeWidth={2.5}
      />
    </button>

    {/* 0fr → 1fr grid trick expands to the answer's real height, no clipping. */}
    <div
      className={`grid transition-all duration-300 ease-out ${
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <p className="tile-body max-w-[80ch] pb-6 pl-[3.25rem] pr-5 text-muted-foreground md:pl-[4rem] md:pr-7">
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
    { question: t("faq.q1"), answer: t("faq.a1r") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
    { question: t("faq.q5"), answer: t("faq.a5") },
    { question: t("faq.q6"), answer: t("faq.a6") },
    { question: t("faq.q7"), answer: t("faq.a7") },
    { question: t("faq.q8"), answer: t("faq.a8") },
    { question: t("faq.q9"), answer: t("faq.a9") },
    { question: t("faq.q10"), answer: t("faq.a10") },
    { question: t("faq.q11"), answer: t("faq.a11") },
  ];

  return (
    <Section id="faq" index={9} total={10} tall label={t("faq.eyebrow")} bodyClassName="items-start">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-[6%]">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:col-span-4 lg:self-start">
          <h2 className="ed-h2">
            {t("faq.headline1")}{" "}
            <span className="bg-accent-purple px-1.5 text-background">{t("faq.headline2")}</span>
          </h2>
          <p className="ed-lede mt-6 max-w-[38ch] text-muted-foreground">
            {t("faq.lede")}
          </p>
        </div>

        <div className="space-y-2 lg:col-span-8">
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
    </Section>
  );
};

export default FAQSection;
