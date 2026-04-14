import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import heroVault from "@/assets/Heirloomapp-hero.png";

const HeroSection = () => {
  const { isConnected } = useWallet();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLaunch = () => {
    if (isConnected) {
      navigate("/create-vault");
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <section className="relative overflow-hidden py-16 px-6 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-start">
          <span className="neo-badge bg-accent-lime rotate-[-2deg]">
            Solana Inheritance Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="neo-slide-up">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-6">
              Protect your{" "}
              <span className="bg-accent-pink px-3 inline-block rotate-[-1deg]">
                assets.
              </span>{" "}
              Pass it on{" "}
              <span className="bg-accent-lime px-3 inline-block rotate-[1deg]">
                trustlessly.
              </span>
            </h1>
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-10 max-w-xl">
              Lock tokens into a heartbeat vault on Solana.
              Check in periodically -- or your heirs inherit automatically.
              No lawyers. No custodians. No seed phrase sharing.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="lime" size="xl" onClick={handleLaunch}>
                {isConnected ? "Create Vault" : "Launch App"}
              </Button>
              <a
                href="https://ge0frey-heirloom-61.mintlify.app/introduction"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="xl">
                  Read the docs
                </Button>
              </a>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end neo-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="neo-card-static rotate-[2deg] max-w-md w-full hover:rotate-[0deg] transition-transform duration-300">
              <img
                src={heroVault}
                alt="Heirloom Vault with heartbeat pulse"
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -top-4 -right-2 neo-badge bg-accent-yellow rotate-[12deg] animate-float text-xs">
              Secured
            </div>
            <div className="absolute -bottom-4 left-4 neo-badge bg-accent-cyan rotate-[-6deg] text-xs">
              On Solana
            </div>
          </div>
        </div>
      </div>

      <WalletConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
};

export default HeroSection;
