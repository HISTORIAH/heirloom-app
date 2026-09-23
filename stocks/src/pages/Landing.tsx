import "@/styles/landing.css";
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
import { Closing, LandingFooter } from "@/components/landing/Closing";
import { Ticks } from "@/components/landing/Primitives";

/** Vertical rhythm between sections, with the registration ticks halfway. */
const Gap: React.FC = () => (
  <div className="py-16 md:py-24">
    <Ticks />
  </div>
);

/**
 * The marketing page at stocks.heirlm.xyz/. It has nothing in common with the
 * app's routes beyond the tokens: its own nav, no wallet, and its own styles
 * (styles/landing.css). The app itself starts at /portfolio.
 */
const Landing = () => (
  <div className="lp min-h-screen">
    <div className="lp-rules" aria-hidden="true">
      <div />
    </div>
    <div className="lp-body">
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
      <LandingFooter />
    </div>
  </div>
);

export default Landing;
