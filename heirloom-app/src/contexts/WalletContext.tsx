import React, { createContext, useContext, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { RPC_URL } from "@/config/constants";

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  connection: import("@solana/web3.js").Connection;
  wallet: ReturnType<typeof useSolanaWallet>;
}

const WalletContext = createContext<WalletState | null>(null);

const WalletContextInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wallet = useSolanaWallet();
  const { connection } = useConnection();

  const value: WalletState = useMemo(
    () => ({
      isConnected: wallet.connected,
      publicKey: wallet.publicKey?.toBase58() ?? null,
      connectWallet: async () => {
        if (wallet.wallet) {
          await wallet.connect();
        } else {
          await wallet.select("Phantom" as never);
        }
      },
      disconnectWallet: async () => {
        await wallet.disconnect();
      },
      connection,
      wallet,
    }),
    [wallet, connection]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletContextInner>{children}</WalletContextInner>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
