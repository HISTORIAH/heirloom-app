import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletContext";
import { useTour } from "@/contexts/TourContext";
import { useNavigate } from "react-router-dom";
import heroVault from "@/assets/Heirloomapp-hero.png";

const HeroSection = () => {
  const { isConnected } = useWallet();
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  const handleLaunch = () => {
    // Launch App walks new visitors through the app tour (no wallet needed).
    // Connected users jump straight to creating a vault.
    if (isConnected) {
      navigate("/create-vault");
    } else {
      startTour();
    }
  };

  return (
    <section className="relative overflow-hidden py-16 px-6 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-start">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
            Solana Inheritance Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="neo-slide-up">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-6">
              Protect your{" "}
              <span className="bg-accent-pink px-3 inline-block rotate-[-1deg]">assets.</span> Pass
              it on{" "}
              <span className="bg-accent-lime px-3 inline-block rotate-[1deg]">trustlessly.</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-10 max-w-xl">
              Lock assets into a heartbeat vault on Solana. Check in periodically -- or your heirs
              inherit automatically. No lawyers. No custodians. No seed phrase sharing.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="lime" size="xl" onClick={handleLaunch}>
                {isConnected ? "Create Vault" : "Launch Tutorial"}
              </Button>
              <Button variant="outline" size="xl" onClick={() => setDemoOpen(true)}>
                View Demo
              </Button>
            </div>
          </div>

          <div
            className="relative flex justify-center lg:justify-end neo-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="neo-card-static rotate-[2deg] max-w-md w-full hover:rotate-[0deg] transition-transform duration-300">
              <img
                src={heroVault}
                alt="Heirloom Vault with heartbeat pulse"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl p-0 gap-0 border-4 border-foreground bg-background rounded-none shadow-[8px_8px_0px_0px_hsl(var(--foreground))] sm:shadow-[12px_12px_0px_0px_hsl(var(--foreground))] sm:rounded-none">
          <div className="flex items-center justify-between border-b-4 border-foreground bg-accent-yellow px-4 py-3 sm:px-6 sm:py-4">
            <DialogTitle className="text-lg sm:text-2xl font-black uppercase tracking-tight">
              Heirloom Demo
            </DialogTitle>
            <DialogDescription className="sr-only">
              Embedded YouTube video showing how Heirloom works.
            </DialogDescription>
          </div>
          <div className="relative w-full bg-foreground" style={{ aspectRatio: "16 / 9" }}>
            {demoOpen && (
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/zqF4Pnm1G2w?si=NkN81t8zX3ZG1fNT&autoplay=1&rel=0"
                title="Heirloom demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
