import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import VaultLifecycleSection from "@/components/VaultLifecycleSection";
import WhySolanaSection from "@/components/WhySolanaSection";
import ComparisonSection from "@/components/ComparisonSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <HeroSection />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <div id="vault-lifecycle">
        <VaultLifecycleSection />
      </div>
      <div id="why-solana">
        <WhySolanaSection />
      </div>
      <div id="compare">
        <ComparisonSection />
      </div>
      <div id="faq">
        <FAQSection />
      </div>
      <CTASection />
      <FooterSection />
    </div>
  );
};

export default Index;
