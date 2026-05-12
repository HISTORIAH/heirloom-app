import React, { createContext, useContext, useMemo } from "react";
import { useWalletUi } from "@wallet-ui/react";
import { createSolanaRpc, createSolanaRpcSubscriptions, type Address, } from "@solana/kit";
import { RPC_URL, RPC_WS_URL } from "@/config/constants";

const rpcSingleton = createSolanaRpc(RPC_URL);
const rpcSubscriptionsSingleton = createSolanaRpcSubscriptions(RPC_WS_URL);

export type AppRpc = typeof rpcSingleton;
export type AppRpcSubscriptions = typeof rpcSubscriptionsSingleton;

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  address: Address | null;
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const walletUi = useWalletUi() as unknown as {
    account?: { address: string } | null;
    connected?: boolean;
    disconnect?: () => Promise<void> | void;
  };

  const account = walletUi?.account ?? null;
  const addressStr: string | null = account?.address ?? null;

  const value: WalletState = useMemo(
    () => ({
      isConnected: !!account,
      publicKey: addressStr,
      address: addressStr as Address | null,
      rpc: rpcSingleton,
      rpcSubscriptions: rpcSubscriptionsSingleton,
      disconnectWallet: async () => {
        await walletUi?.disconnect?.();
      },
    }),
    [account, addressStr, walletUi],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
