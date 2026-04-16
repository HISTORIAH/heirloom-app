import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { address as toAddress, type Address, type TransactionSigner, } from "@solana/kit";
import { useWalletUi, useWalletUiSigner } from "@wallet-ui/react";
import { useWallet } from "./WalletContext";
import {
  discoverVaultTokenAccounts,
  fetchEstateByPair,
  fetchEstatesByAuthority,
  getAtaAddress,
  getVaultAddress,
  sendCloseEstate,
  sendInitialize,
  sendRegisterAndDeposit,
  sendRevoke,
  sendUpdate,
  type Client,
} from "@/lib/contracts";

export interface VaultTokenDisplay {
  mint: string;
  address: string;
  amount: bigint;
  decimals: number;
}

export interface EstateData {
  authority: string;
  heir: string;
  label: string;
  heartbeatInterval: number;
  gracePeriod: number;
  lastHeartbeat: number;
  pauseDuration: number;
  pausedUntil: number;
  createdAt: number;
  isClaimed: boolean;
  isDeferred: boolean;
  delegate: string | null;
  claimableAssets: number;
  estatePda: string;
  vaultPda: string;
  solBalance: number;
  vaultTokens: VaultTokenDisplay[];
  state: "active" | "grace" | "claimable" | "distributed";
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
}

export interface TokenDeposit {
  mint: string;
  amount: bigint;
  decimals: number;
  tokenProgram?: string;
}

export interface CreateEstateInput {
  heir: string;
  label: string;
  heartbeatInterval: number;
  gracePeriod: number;
  pauseDuration: number;
  amountLamports: bigint;
  delegate?: string;
  tokens?: TokenDeposit[];
}

interface VaultState {
  estates: EstateData[];
  loading: boolean;
  error: string | null;
  pendingTxId: string | null;
  pendingCreate: boolean;
  fetchEstates: () => Promise<void>;
  createEstateOnChain: (input: CreateEstateInput) => Promise<string>;
  registerAssetOnChain: (heir: string, token: TokenDeposit) => Promise<string>;
  sendHeartbeatOnChain: (heir: string) => Promise<string>;
  revokeEstateOnChain: (heir: string) => Promise<string>;
  clearVault: () => void;
}

const VaultContext = createContext<VaultState | null>(null);


function computeState(
  lastHeartbeat: number,
  heartbeatInterval: number,
  gracePeriod: number,
  pausedUntil: number,
  isClaimed: boolean,
  createdAt: number,
  vaultEmpty: boolean,
): { state: EstateData["state"]; secondsUntilGrace: number; secondsUntilClaimable: number } {
  // Empty vault or already claimed → distributed. Program leaves the estate
  // account on-chain after claim; we treat a drained vault as distributed
  // from the UI so it cannot be misread as claimable.
  if (isClaimed || vaultEmpty) {
    return { state: "distributed", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  // Program sets last_heartbeat = clock.unix_timestamp on init (same as created_at).
  // Fallback to created_at only as a defensive measure.
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + heartbeatInterval;
  const baseClaimable = graceDeadline + gracePeriod;
  const claimableAt = Math.max(baseClaimable, pausedUntil);

  if (now >= claimableAt) {
    return { state: "claimable", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  if (now >= graceDeadline) {
    return {
      state: "grace",
      secondsUntilGrace: 0,
      secondsUntilClaimable: claimableAt - now,
    };
  }
  return {
    state: "active",
    secondsUntilGrace: graceDeadline - now,
    secondsUntilClaimable: claimableAt - now,
  };
}

type VaultUiShim = { account?: { address: string } | null };

const VaultProviderInner: React.FC<{
  signer: TransactionSigner;
  authority: Address;
  children: React.ReactNode;
}> = ({ signer, authority, children }) => {
  const { rpc, rpcSubscriptions } = useWallet();
  const [estates, setEstates] = useState<EstateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const client: Client = useMemo(() => ({ rpc, rpcSubscriptions }), [rpc, rpcSubscriptions]);

  const fetchEstates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Discover all estates on-chain where this wallet is authority.
      const onChainEstates = await fetchEstatesByAuthority(rpc, authority);

      const results: EstateData[] = [];
      for (const estate of onChainEstates) {
        try {
          const heir = toAddress(estate.data.heir);
          const vaultPda = await getVaultAddress(authority, heir);
          const [{ value: lamports }, vaultTokens] = await Promise.all([
            rpc.getBalance(vaultPda).send(),
            discoverVaultTokenAccounts(rpc, vaultPda),
          ]);
          const lastHeartbeat = Number(estate.data.lastHeartbeat);
          const heartbeatInterval = Number(estate.data.heartbeatInterval);
          const gracePeriod = Number(estate.data.gracePeriod);
          const pausedUntil = Number(estate.data.pausedUntil);
          const createdAt = Number(estate.data.createdAt);
          const hasTokenBalance = vaultTokens.length > 0;
          const vaultEmpty = estate.data.claimableAssets === 0 && Number(lamports) === 0 && !hasTokenBalance;
          const { state, secondsUntilGrace, secondsUntilClaimable } = computeState(
            lastHeartbeat,
            heartbeatInterval,
            gracePeriod,
            pausedUntil,
            estate.data.isClaimed,
            createdAt,
            vaultEmpty,
          );

          // Extract delegate address from Option
          let delegateAddr: string | null = null;
          const del = estate.data.delegate;
          if (del && typeof del === "object" && "__option" in del) {
            const opt = del as { __option: "Some" | "None"; value?: string };
            if (opt.__option === "Some" && opt.value) delegateAddr = opt.value;
          }

          results.push({
            authority: estate.data.authority,
            heir: estate.data.heir,
            label: estate.data.label,
            heartbeatInterval,
            gracePeriod,
            lastHeartbeat,
            pauseDuration: Number(estate.data.pauseDuration),
            pausedUntil,
            createdAt,
            isClaimed: estate.data.isClaimed,
            isDeferred: estate.data.isDeferred,
            delegate: delegateAddr,
            claimableAssets: estate.data.claimableAssets,
            estatePda: estate.address,
            vaultPda,
            solBalance: Number(lamports),
            vaultTokens,
            state,
            secondsUntilGrace,
            secondsUntilClaimable,
          });
        } catch {
          // skip failed estates
        }
      }
      // Hide fully-distributed-and-empty estates from dashboard display
      const isFullyEmpty = (r: EstateData) =>
        r.state === "distributed" && r.solBalance === 0 && r.vaultTokens.length === 0;
      const visible = results.filter((r) => !isFullyEmpty(r));
      setEstates(visible);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch estates");
    } finally {
      setLoading(false);
    }
  }, [authority, rpc]);

  useEffect(() => {
    if (estates.length > 0) setPendingCreate(false);
  }, [estates.length]);

  useEffect(() => {
    fetchEstates();
    const interval = pendingCreate ? 5000 : 15000;
    pollRef.current = setInterval(fetchEstates, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchEstates, pendingCreate]);

  const createEstateOnChain = useCallback(
    async (input: CreateEstateInput): Promise<string> => {
      const heirAddress = toAddress(input.heir);
      // Pre-flight: if estate already exists, try to close it first.
      // closeEstate succeeds only when claimable_assets == 0 (i.e. stale/empty).
      const existing = await fetchEstateByPair(rpc, authority, heirAddress);
      if (existing.exists) {
        const canClose = existing.data.claimableAssets === 0;
        if (!canClose) {
          throw new Error(
            "An active estate with registered assets already exists for this heir. " +
            "Revoke or claim all assets first, then try again.",
          );
        }
        // Close stale estate so we can re-init the PDA.
        await sendCloseEstate(client, {
          authority: signer,
          heir: heirAddress,
        });
        // Small delay to let the close tx finalize before re-init
        await new Promise((r) => setTimeout(r, 1000));
      }
      const txId = await sendInitialize(client, {
        authority: signer,
        heir: heirAddress,
        amount: input.amountLamports,
        label: input.label,
        heartbeatInterval: BigInt(input.heartbeatInterval),
        gracePeriod: BigInt(input.gracePeriod),
        pauseDuration: BigInt(input.pauseDuration),
        delegate: input.delegate ? toAddress(input.delegate) : undefined,
      });
      // Register additional token assets after init
      if (input.tokens && input.tokens.length > 0) {
        for (const tok of input.tokens) {
          await sendRegisterAndDeposit(client, {
            authority: signer,
            heir: heirAddress,
            mint: toAddress(tok.mint),
            amount: tok.amount,
            decimals: tok.decimals,
            tokenProgram: tok.tokenProgram ? toAddress(tok.tokenProgram) : undefined,
          });
        }
      }
      setPendingTxId(txId);
      setPendingCreate(true);
      return txId;
    },
    [client, rpc, signer, authority],
  );

  const registerAssetOnChain = useCallback(
    async (heir: string, token: TokenDeposit): Promise<string> => {
      const txId = await sendRegisterAndDeposit(client, {
        authority: signer,
        heir: toAddress(heir),
        mint: toAddress(token.mint),
        amount: token.amount,
        decimals: token.decimals,
        tokenProgram: token.tokenProgram ? toAddress(token.tokenProgram) : undefined,
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const sendHeartbeatOnChain = useCallback(
    async (heir: string): Promise<string> => {
      const txId = await sendUpdate(client, {
        authority: signer,
        heir: toAddress(heir),
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const revokeEstateOnChain = useCallback(
    async (heir: string): Promise<string> => {
      const heirAddr = toAddress(heir);
      let lastTx = "";

      // Discover vault token accounts and revoke each one first
      const vaultPda = await getVaultAddress(authority, heirAddr);
      const vaultTokens = await discoverVaultTokenAccounts(rpc, vaultPda);

      for (const vt of vaultTokens) {
        const mintAddr = toAddress(vt.mint);
        const authorityAta = await getAtaAddress(authority, mintAddr);
        lastTx = await sendRevoke(client, {
          authority: signer,
          heir: heirAddr,
          mint: mintAddr,
          authorityTokenAccount: authorityAta,
          vaultTokenAccount: toAddress(vt.address),
        });
      }

      // Revoke SOL (closes estate + vault when claimable_assets reaches 0)
      lastTx = await sendRevoke(client, {
        authority: signer,
        heir: heirAddr,
      });

      setPendingTxId(lastTx);
      return lastTx;
    },
    [client, rpc, signer, authority],
  );

  const clearVault = useCallback(() => {
    setEstates([]);
    setPendingTxId(null);
    setPendingCreate(false);
    setError(null);
  }, []);

  const value: VaultState = {
    estates,
    loading,
    error,
    pendingTxId,
    pendingCreate,
    fetchEstates,
    createEstateOnChain,
    registerAssetOnChain,
    sendHeartbeatOnChain,
    revokeEstateOnChain,
    clearVault,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

const VaultProviderDisconnected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stubValue: VaultState = {
    estates: [],
    loading: false,
    error: null,
    pendingTxId: null,
    pendingCreate: false,
    fetchEstates: async () => { },
    createEstateOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    registerAssetOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    sendHeartbeatOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    revokeEstateOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    clearVault: () => { },
  };
  return <VaultContext.Provider value={stubValue}>{children}</VaultContext.Provider>;
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const walletUi = useWalletUi() as unknown as VaultUiShim;
  const account = walletUi?.account ?? null;

  if (!account) {
    return <VaultProviderDisconnected>{children}</VaultProviderDisconnected>;
  }

  return <ConnectedProvider account={account}>{children}</ConnectedProvider>;
};

const ConnectedProvider: React.FC<{
  account: { address: string };
  children: React.ReactNode;
}> = ({ account, children }) => {
  const signer = useWalletUiSigner() as unknown as TransactionSigner;
  const authority = toAddress(account.address);
  return (
    <VaultProviderInner signer={signer} authority={authority}>
      {children}
    </VaultProviderInner>
  );
};

export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
};
