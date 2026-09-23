import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Intro, Pillars } from "@/components/landing/Intro";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CatalogMarquee } from "@/components/landing/CatalogMarquee";
import { Cycle } from "@/components/landing/Cycle";
import { LivePrice } from "@/components/landing/LivePrice";
import { OpenApp } from "@/components/landing/OpenApp";
import { Cta, Facts } from "@/components/landing/Cta";
import { IssuerControls } from "@/components/landing/IssuerControls";
import { Closing } from "@/components/landing/Closing";
import { Ticks } from "@/components/landing/Primitives";
import { SiteFooter } from "@/components/shell/SiteFooter";

/** Vertical rhythm between sections, with the registration ticks halfway. */
const Gap: React.FC = () => (
  <div className="py-16 md:py-24">
    <Ticks />
  </div>
);

/**
 * The marketing page at stocks.heirlm.xyz/. It shares the app's visual
 * language (styles/stocks.css) but not its chrome: its own nav, no wallet.
 * The app itself starts at /portfolio.
 */
const Landing = () => (
  <div className="hs min-h-screen">
    <div className="hs-rules" aria-hidden="true">
      <div />
    </div>
    <div className="hs-body">
      <LandingNav />
      <main>
        <Ticks className="mt-8" />
        <Hero />
        <Ticks />
        <div className="h-16 md:h-24" />
        <Intro />
        <div className="h-4" />
        <Pillars />
        <Gap />
        <HowItWorks />
        <Gap />
        <CatalogMarquee />
        <Gap />
        <Cycle />
        <Gap />
        <LivePrice />
        <Gap />
        <OpenApp />
        <Gap />
        <Cta />
        <div className="h-4" />
        <Facts />
        <Gap />
        <IssuerControls />
        <Gap />
        <Closing />
        <div className="h-16 md:h-24" />
      </main>
      <SiteFooter />
    </div>
  </div>
);

export default Landing;
