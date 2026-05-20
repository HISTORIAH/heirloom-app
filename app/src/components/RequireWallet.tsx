import React, { useState } from "react";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { useWalletUi, useWalletUiSigner } from "@wallet-ui/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletConnectDialog from "@/components/WalletConnectDialog";

export interface WalletCtx {
  signer: TransactionSigner;
  address: Address;
  addressStr: string;
}

interface RequireWalletProps {
  message?: string;
  children: (ctx: WalletCtx) => React.ReactNode;
}

type WalletUiShim = { account?: { address: string } | null };

export const RequireWallet: React.FC<RequireWalletProps> = ({ message, children }) => {
  const walletUi = useWalletUi() as unknown as WalletUiShim;
  const account = walletUi?.account ?? null;

  if (!account) {
    return <ConnectGate message={message} />;
  }

  return <Connected account={account}>{children}</Connected>;
};

const ConnectGate: React.FC<{ message?: string }> = ({ message }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="neo-card-static text-center max-w-md" data-tour="require-wallet">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-3">Connect Wallet</h2>
        <p className="text-muted-foreground font-medium mb-6">
          {message ?? "Connect your wallet to continue."}
        </p>
        <Button variant="lime" size="lg" onClick={() => setDialogOpen(true)}>
          Connect Wallet
        </Button>
      </div>
      <WalletConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

const Connected: React.FC<{
  account: { address: string };
  children: (ctx: WalletCtx) => React.ReactNode;
}> = ({ account, children }) => {
  const signer = useWalletUiSigner() as unknown as TransactionSigner;
  const address = toAddress(account.address);
  return <>{children({ signer, address, addressStr: account.address })}</>;
};
