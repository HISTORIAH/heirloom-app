import React from "react";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { useWalletUi, type UiWalletAccount } from "@wallet-ui/react";
import { useTransactionSigner } from "@/hooks/useTransactionSigner";

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
  const { account } = useWalletUi();

  if (!account) {
    return <>{children(null)}</>;
  }

  return <Connected account={account}>{children}</Connected>;
};

const Connected: React.FC<{
  account: UiWalletAccount;
  children: (ctx: WalletCtx) => React.ReactNode;
}> = ({ account, children }) => {
  const signer = useTransactionSigner(account);
  const address = toAddress(account.address);
  return <>{children({ signer, address, addressStr: account.address })}</>;
};
