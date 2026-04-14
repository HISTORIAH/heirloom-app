import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { useWalletUi, useWalletUiWallet, type UiWallet } from "@wallet-ui/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import heroVault from "@/assets/Heirloomapp-hero.png";

interface WalletRowProps {
  wallet: UiWallet;
  onConnected: () => void;
}

const WalletRow = ({ wallet, onConnected }: WalletRowProps) => {
  const { connect, isConnecting } = useWalletUiWallet({ wallet });
  return (
    <button
      type="button"
      disabled={isConnecting}
      onClick={async () => {
        try {
          const accounts = await connect();
          if (accounts.length > 0) onConnected();
        } catch (err) {
          console.error("wallet connect failed", err);
        }
      }}
      className="w-full neo-border rounded-xl px-4 py-3 bg-secondary hover:bg-accent-lime transition-all duration-150 flex items-center gap-3 font-black disabled:opacity-60"
    >
      {wallet.icon && (
        <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 rounded-md" />
      )}
      <span className="flex-1 text-left">{wallet.name}</span>
      {isConnecting && <span className="text-xs font-bold">Connecting…</span>}
    </button>
  );
};

const HeroSection = () => {
  const { isConnected } = useWallet();
  const navigate = useNavigate();
  const walletUi = useWalletUi() as unknown as { wallets?: UiWallet[] };
  const wallets = walletUi?.wallets ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (isConnected && dialogOpen) setDialogOpen(false);
  }, [isConnected, dialogOpen]);

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="neo-card-static max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Connect Wallet</DialogTitle>
            <DialogDescription className="font-medium">
              Choose a Solana wallet to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {wallets.length === 0 ? (
              <a
                href="https://solana.com/solana-wallets"
                target="_blank"
                rel="noopener noreferrer"
                className="neo-border rounded-xl px-4 py-3 bg-accent-yellow font-black text-center"
              >
                No wallets detected — install one
              </a>
            ) : (
              wallets.map((w) => (
                <WalletRow
                  key={w.name}
                  wallet={w}
                  onConnected={() => setDialogOpen(false)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
