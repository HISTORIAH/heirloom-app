import NavBar from "@/components/NavBar";
import GridRules from "@/components/landing/GridRules";
import HeroSection from "@/components/HeroSection";
import UseCasesSection from "@/components/UseCasesSection";
import IdleAssetsSection from "@/components/IdleAssetsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import YieldSection from "@/components/YieldSection";
import RecoverySection from "@/components/RecoverySection";
import VaultLifecycleSection from "@/components/VaultLifecycleSection";
import WhySolanaSection from "@/components/WhySolanaSection";
import ComparisonSection from "@/components/ComparisonSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import FooterSection from "@/components/FooterSection";

// Section order is the argument: what the vault is for, why holding alone is
// not enough, how it runs, then the two jobs people underestimate — yield and
// getting back in — before the protocol detail and the objections.
//
// Everything below the nav sits on one ruled page running edge to edge:
// GridRules draws the column rules once for the whole scroll, each section is
// a full-viewport spread that contributes a horizontal on its running head,
// and the tiles are opaque so they mask the lines they cover. Anchors live on
// the sections themselves — scrolling to one lands on its running head.
const Index = () => {
  return (
    // overflow-x: clip, not hidden — the orbiting hero throws rotated boxes a
    // little past the right gutter, and clip stops them scrolling the page
    // without turning this into a scroll container, which would kill the
    // sticky nav.
    <div className="min-h-screen overflow-x-clip bg-background">
      <NavBar />
      <div className="relative">
        <GridRules />
        <div className="relative z-10">
          <HeroSection />
          <UseCasesSection />
          <IdleAssetsSection />
          <HowItWorksSection />
          <YieldSection />
          <RecoverySection />
          <VaultLifecycleSection />
          <WhySolanaSection />
          <ComparisonSection />
          <FAQSection />
          <CTASection />
          <FooterSection />
        </div>
      </div>
    </div>
  );
};

export default Index;
