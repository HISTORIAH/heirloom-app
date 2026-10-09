import React, { createContext, useContext, useMemo } from "react";
import { SelectedWalletAccountContextProvider, useSelectedWalletAccount } from "@solana/react";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/react";
import { createSolanaRpc, createSolanaRpcSubscriptions, type Address } from "@solana/kit";
import { SOLANA_RPC_ENDPOINT, SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT } from "@/config";
import { SELECTED_WALLET_STORAGE_KEY } from "@/lib/constants";
import { disconnectWallet, isUsableWallet, transactionVersionFor } from "@/lib/wallet";
import type { TxMessageVersion } from "@/types/tx";

const rpcSingleton = createSolanaRpc(SOLANA_RPC_ENDPOINT);
const rpcSubscriptionsSingleton = createSolanaRpcSubscriptions(SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT);

export type AppRpc = typeof rpcSingleton;
export type AppRpcSubscriptions = typeof rpcSubscriptionsSingleton;

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  address: Address | null;
  /** Raw wallet-standard account handle — needed to invoke features like signMessage. */
  account: UiWalletAccount | null;
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
  /** v1 when the connected wallet can sign it, otherwise v0. */
  transactionVersion: TxMessageVersion;
  /** Wallets the user can connect: on our chain and able to sign and send. */
  wallets: readonly UiWallet[];
  /** Makes `account` the connected one (after the wallet approves a connect). */
  selectAccount: (account: UiWalletAccount) => void;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

/** Remembers the connected account, so the same wallet reconnects on the next visit. */
const selectedWalletStorage = {
  getSelectedWallet: () => localStorage.getItem(SELECTED_WALLET_STORAGE_KEY),
  storeSelectedWallet: (accountKey: string) =>
    localStorage.setItem(SELECTED_WALLET_STORAGE_KEY, accountKey),
  deleteSelectedWallet: () => localStorage.removeItem(SELECTED_WALLET_STORAGE_KEY),
};

/**
 * Everything wallet-related in one provider. @solana/react's selected-account provider keeps
 * the chosen account (restoring it on the next visit, following the wallet's account changes,
 * clearing it when the wallet disconnects), limited to wallets the app can use. Connecting
 * happens in WalletConnectDialog; the rest of the app reads the wallet through `useWallet`.
 */
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SelectedWalletAccountContextProvider
    filterWallets={isUsableWallet}
    stateSync={selectedWalletStorage}
  >
    <WalletStateProvider>{children}</WalletStateProvider>
  </SelectedWalletAccountContextProvider>
);

/** The app's view of the connected wallet, built on the selected account. */
const WalletStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAccount, setSelectedAccount, wallets] = useSelectedWalletAccount();

  const value: WalletState = useMemo(() => {
    const account = selectedAccount ?? null;
    const wallet = wallets.find((w) => w.accounts.some((a) => a.address === account?.address));
    return {
      isConnected: !!account,
      publicKey: account?.address ?? null,
      address: (account?.address ?? null) as Address | null,
      account,
      rpc: rpcSingleton,
      rpcSubscriptions: rpcSubscriptionsSingleton,
      transactionVersion: transactionVersionFor(selectedAccount),
      wallets,
      selectAccount: setSelectedAccount,
      disconnectWallet: async () => {
        setSelectedAccount(undefined);
        await disconnectWallet(wallet);
      },
    };
  }, [selectedAccount, setSelectedAccount, wallets]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
