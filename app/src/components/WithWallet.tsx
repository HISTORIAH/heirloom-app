import React from "react";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { useWalletAccountTransactionSigner } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/react";
import { useWallet } from "@/contexts/WalletContext";
import { SOLANA_CHAIN } from "@/lib/utils";

export interface WalletCtx {
  signer: TransactionSigner;
  address: Address;
  addressStr: string;
}

/**
 * Renders children with the connected wallet context, or `null` when no wallet
 * is connected. Pages stay fully viewable while disconnected — only their
 * actions are gated, not the whole route. The signer hook is only called once
 * an account exists (it requires a non-null account), so disconnected renders
 * are safe.
 */
export const WithWallet: React.FC<{
  children: (ctx: WalletCtx | null) => React.ReactNode;
}> = ({ children }) => {
  const { account } = useWallet();

  if (!account) {
    return <>{children(null)}</>;
  }

  return <Connected account={account}>{children}</Connected>;
};

const Connected: React.FC<{
  account: UiWalletAccount;
  children: (ctx: WalletCtx) => React.ReactNode;
}> = ({ account, children }) => {
  const signer = useWalletAccountTransactionSigner(account, SOLANA_CHAIN);
  const address = toAddress(account.address);
  return <>{children({ signer, address, addressStr: account.address })}</>;
};
