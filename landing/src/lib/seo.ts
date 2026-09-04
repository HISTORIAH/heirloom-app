import type { LandingT } from "@heirloom/i18n/landing";
import { SITE_URL, DOCS_URL, GITHUB_URL, TWITTER_URL, OG_IMAGE } from "./site";

/** og:locale wants a territory, which BCP-47 language codes do not carry. */
export const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
  pt: "pt_BR",
  ja: "ja_JP",
  ko: "ko_KR",
  vi: "vi_VN",
  tr: "tr_TR",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

/**
 * The site's structured data, built from the same locale files the page is
 * rendered from. It used to be hand-maintained JSON in index.html and had
 * already drifted from the FAQ it described — generating it is the only way
 * the two stay in step.
 *
 * Organization, WebSite and SoftwareApplication describe one entity each and
 * keep a stable @id across locales; only the FAQ is per-document.
 */
export function structuredData(t: LandingT, canonical: string) {
  const faqs = Array.from({ length: 11 }, (_, i) => ({
    "@type": "Question",
    name: t(`faq.q${i + 1}`),
    acceptedAnswer: {
      "@type": "Answer",
      text: t(i === 0 ? "faq.a1r" : `faq.a${i + 1}`),
    },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Heirloom",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/favicon.png`,
        description:
          "Heirloom is a Solana-native inheritance protocol. Lock digital assets into an estate you control, earn yield on idle balances, recover a lost wallet through a backup you name, and hand off on-chain if you stop checking in — no custodians, no seed-phrase sharing.",
        sameAs: [TWITTER_URL, GITHUB_URL, DOCS_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "Heirloom",
        description:
          "Self-custody estates on Solana that earn yield, recover lost wallets, and hand off on-chain.",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Heirloom",
        url: `${SITE_URL}/`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Solana",
        description:
          "A trustless, on-chain estate protocol on Solana for self-custody continuity. Lock digital assets into an estate, route idle balances into Lulo lending or native SOL staking for yield, and name the wallets that can claim — including a backup of your own for wallet recovery. Check in on your own schedule; if the check-ins stop, a grace period runs and the named wallets claim their splits automatically — non-custodial, with no seed-phrase sharing.",
        keywords:
          "Solana estate protocol, self-custody estate, on-chain estate planning, wallet recovery, lost wallet recovery Solana, yield on idle assets, Lulo lending, native SOL staking, on-chain inheritance, trustless handoff, self-custody continuity, SOL vault, SPL token vault, self-custody vault, guardian recovery wallet, programmable beneficiaries, non-custodial yield",
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description:
            "Free to open an estate and check in; standard Solana network fees apply. Claims incur a 0.75% protocol fee, emergency withdrawals a 0.5% fee, and yield strategies a 10% fee on yield earned only.",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: faqs,
      },
    ],
  };
}

export { OG_IMAGE };
