import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { useWalletUi, useWalletUiSigner } from "@wallet-ui/react";
import { useWallet } from "./WalletContext";
import {
  depositSol,
  depositToken,
  discoverVaultTokenAccounts,
  fetchEstateByPair,
  fetchEstatesByAuthority,
  fetchVaultClaimableLamports,
  getAtaAddress,
  getEstateAddress,
  getVaultAddress,
  initializeWithTokens,
  registerAsset,
  registerSolDeposit,
  revokeAll,
  updateFields,
  updateHeirAll,
  type HeirloomClient,
} from "@/lib/heirloom";
import type { VaultTokenHolding } from "@/types";
import { computeEstateState, type EstateUiState } from "@/lib/estateState";
import { unwrapOption } from "@/lib/anchor";
import { errMsg } from "@/lib/utils";
import { TREASURY_ADDRESS } from "@historiah/heirloom";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  hbSigner: string | null;
  claimableAssets: number;
  estatePda: string;
  vaultPda: string;
  solBalance: number;
  vaultTokens: VaultTokenHolding[];
  state: EstateUiState;
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
  hbSigner?: string;
  tokens?: TokenDeposit[];
}

export interface UpdateEstateFields {
  heartbeatInterval?: bigint;
  gracePeriod?: bigint;
  pauseDuration?: bigint;
  label?: string;
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
  registerSolOnChain: (heir: string, lamports: bigint) => Promise<string>;
  depositSolOnChain: (vaultPda: string, lamports: bigint) => Promise<string>;
  depositTokenOnChain: (holding: VaultTokenHolding, amount: bigint) => Promise<string>;
  sendHeartbeatOnChain: (heir: string) => Promise<string>;
  updateEstateFieldsOnChain: (heir: string, fields: UpdateEstateFields) => Promise<string>;
  revokeEstateOnChain: (heir: string) => Promise<string>;
  updateHeirOnChain: (heir: string, newHeir: string) => Promise<string>;
  clearVault: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const VaultContext = createContext<VaultState | null>(null);

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

  const client: HeirloomClient = useMemo(() => ({ rpc, rpcSubscriptions }), [rpc, rpcSubscriptions]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchEstates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const onChainEstates = await fetchEstatesByAuthority(client, authority);

      const results: EstateData[] = [];
      for (const estate of onChainEstates) {
        try {
          const heir = toAddress(estate.data.heir);
          const vaultPda = await getVaultAddress(authority, heir);
          const [lamports, vaultTokens] = await Promise.all([
            fetchVaultClaimableLamports(client, vaultPda),
            discoverVaultTokenAccounts(vaultPda),
          ]);

          const lastHeartbeat = Number(estate.data.lastHeartbeat);
          const heartbeatInterval = Number(estate.data.heartbeatInterval);
          const gracePeriod = Number(estate.data.gracePeriod);
          const pausedUntil = Number(estate.data.pausedUntil);
          const createdAt = Number(estate.data.createdAt);
          const hasTokenBalance = vaultTokens.length > 0;
          const vaultEmpty = estate.data.claimableAssets === 0 && Number(lamports) === 0 && !hasTokenBalance;

          const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
            lastHeartbeat,
            heartbeatInterval,
            gracePeriod,
            pausedUntil,
            isClaimed: estate.data.isClaimed,
            createdAt,
            vaultEmpty,
          });

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
            delegate: unwrapOption<string>(estate.data.delegate),
            hbSigner: unwrapOption<string>(estate.data.hbSigner),
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
      setEstates(results);
    } catch (e: unknown) {
      setError(errMsg(e, "Failed to fetch estates"));
    } finally {
      setLoading(false);
    }
  }, [authority, client]);

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

  // -------------------------------------------------------------------------
  // Transaction helpers
  // -------------------------------------------------------------------------

  const trackTx = useCallback((txId: string) => {
    setPendingTxId(txId);
  }, []);

  // -------------------------------------------------------------------------
  // On-chain operations
  // -------------------------------------------------------------------------

  const createEstateOnChain = useCallback(
    async (input: CreateEstateInput): Promise<string> => {
      const heirAddress = toAddress(input.heir);
      const estatePda = await getEstateAddress(authority, heirAddress);
      const vaultPda = await getVaultAddress(authority, heirAddress);

      const rawAccountExists = async (pda: Address): Promise<boolean> => {
        try {
          const res = await rpc.getAccountInfo(pda, { commitment: "confirmed" }).send();
          return res?.value != null;
        } catch {
          return false;
        }
      };

      const existing = await fetchEstateByPair(client, authority, heirAddress);
      if (existing.exists) {
        throw new Error(
          "An active estate already exists for this heir. Revoke or claim all assets first, then try again.",
        );
      }

      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const [e, v] = await Promise.all([rawAccountExists(estatePda), rawAccountExists(vaultPda)]);
        if (!e && !v) break;
        await new Promise((r) => setTimeout(r, 750));
      }
      const [stillEstate, stillVault] = await Promise.all([
        rawAccountExists(estatePda),
        rawAccountExists(vaultPda),
      ]);
      if (stillEstate || stillVault) {
        throw new Error("Prior estate/vault PDAs not yet cleared on-chain. Wait a few seconds and retry.");
      }

      const validTokens = (input.tokens ?? []).filter((tok) => tok.amount > 0n);

      let initArgs: Parameters<typeof initializeWithTokens>[2];
      let extraTokens: Parameters<typeof initializeWithTokens>[3];

      if (input.amountLamports > 0n) {
        initArgs = {
          heir: heirAddress,
          amount: input.amountLamports,
          label: input.label,
          heartbeatInterval: BigInt(input.heartbeatInterval),
          gracePeriod: BigInt(input.gracePeriod),
          pauseDuration: BigInt(input.pauseDuration),
          delegate: input.delegate ? toAddress(input.delegate) : undefined,
          hbSigner: input.hbSigner ? toAddress(input.hbSigner) : undefined,
        };
        extraTokens = validTokens.map((tok) => ({
          mint: toAddress(tok.mint),
          amount: tok.amount,
          tokenProgram: tok.tokenProgram ? toAddress(tok.tokenProgram) : undefined,
        }));
      } else {
        const [primaryToken, ...remainingTokens] = validTokens;
        if (!primaryToken) {
          throw new Error("Select at least one asset (SOL or a token) to create a vault.");
        }
        const mintAddr = toAddress(primaryToken.mint);
        const tokenProgram = primaryToken.tokenProgram ? toAddress(primaryToken.tokenProgram) : undefined;
        const vaultTokenAccount = tokenProgram
          ? await getAtaAddress(vaultPda, mintAddr, tokenProgram)
          : await getAtaAddress(vaultPda, mintAddr);
        const authorityTokenAccount = tokenProgram
          ? await getAtaAddress(authority, mintAddr, tokenProgram)
          : await getAtaAddress(authority, mintAddr);

        initArgs = {
          heir: heirAddress,
          amount: primaryToken.amount,
          label: input.label,
          heartbeatInterval: BigInt(input.heartbeatInterval),
          gracePeriod: BigInt(input.gracePeriod),
          pauseDuration: BigInt(input.pauseDuration),
          delegate: input.delegate ? toAddress(input.delegate) : undefined,
          hbSigner: input.hbSigner ? toAddress(input.hbSigner) : undefined,
          mint: mintAddr,
          tokenProgram,
          vaultTokenAccount,
          authorityTokenAccount,
        };
        extraTokens = remainingTokens.map((tok) => ({
          mint: toAddress(tok.mint),
          amount: tok.amount,
          tokenProgram: tok.tokenProgram ? toAddress(tok.tokenProgram) : undefined,
        }));
      }

      const txId = await initializeWithTokens(client, signer, initArgs, extraTokens);
      setPendingTxId(txId);
      setPendingCreate(true);
      return txId;
    },
    [client, rpc, signer, authority],
  );

  const registerAssetOnChain = useCallback(
    async (heir: string, token: TokenDeposit): Promise<string> => {
      const txId = await registerAsset(client, signer, {
        heir: toAddress(heir),
        mint: toAddress(token.mint),
        amount: token.amount,
        tokenProgram: token.tokenProgram ? toAddress(token.tokenProgram) : undefined,
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const registerSolOnChain = useCallback(
    async (heir: string, lamports: bigint): Promise<string> => {
      const txId = await registerSolDeposit(client, signer, {
        heir: toAddress(heir),
        amount: lamports,
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const depositSolOnChain = useCallback(
    async (vaultPda: string, lamports: bigint): Promise<string> => {
      const txId = await depositSol(client, signer, toAddress(vaultPda), lamports);
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const depositTokenOnChain = useCallback(
    async (holding: VaultTokenHolding, amount: bigint): Promise<string> => {
      const txId = await depositToken(client, signer, holding, amount);
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const sendHeartbeatOnChain = useCallback(
    async (heir: string): Promise<string> => {
      const txId = await updateFields(client, signer, { heir: toAddress(heir) });
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const updateEstateFieldsOnChain = useCallback(
    async (heir: string, fields: UpdateEstateFields): Promise<string> => {
      const txId = await updateFields(client, signer, {
        heir: toAddress(heir),
        heartbeatInterval: fields.heartbeatInterval,
        gracePeriod: fields.gracePeriod,
        pauseDuration: fields.pauseDuration,
        label: fields.label,
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, signer],
  );

  const revokeEstateOnChain = useCallback(
    async (heir: string): Promise<string> => {
      const heirAddr = toAddress(heir);
      const vaultPda = await getVaultAddress(authority, heirAddr);

      const vaultTokens = await discoverVaultTokenAccounts(vaultPda);

      const tokenAssets = await Promise.all(
        vaultTokens.map(async (vt) => {
          const mintAddr = toAddress(vt.mint);
          const tokenProgram = toAddress(vt.tokenProgram);
          const [authorityAta, treasuryAta] = await Promise.all([
            getAtaAddress(authority, mintAddr, tokenProgram),
            getAtaAddress(TREASURY_ADDRESS, mintAddr, tokenProgram),
          ]);
          return {
            mint: mintAddr,
            vaultTokenAccount: toAddress(vt.ata),
            authorityTokenAccount: authorityAta,
            treasuryTokenAccount: treasuryAta,
            tokenProgram,
          };
        }),
      );

      const txId = await revokeAll(client, signer, heirAddr, tokenAssets, true);
      setPendingTxId(txId);
      return txId;
    },
    [client, authority, signer],
  );

  const updateHeirOnChain = useCallback(
    async (heir: string, newHeir: string): Promise<string> => {
      const finalTxId = await updateHeirAll(
        client,
        signer,
        toAddress(heir),
        toAddress(newHeir),
        trackTx,
      );
      setPendingTxId(finalTxId);
      return finalTxId;
    },
    [client, signer, trackTx],
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
    registerSolOnChain,
    depositSolOnChain,
    depositTokenOnChain,
    sendHeartbeatOnChain,
    updateEstateFieldsOnChain,
    revokeEstateOnChain,
    updateHeirOnChain,
    clearVault,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

// ---------------------------------------------------------------------------
// Disconnected stub
// ---------------------------------------------------------------------------

const notConnected = async (): Promise<never> => {
  throw new Error("Wallet not connected");
};

const VaultProviderDisconnected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stubValue: VaultState = {
    estates: [],
    loading: false,
    error: null,
    pendingTxId: null,
    pendingCreate: false,
    fetchEstates: async () => {},
    createEstateOnChain: notConnected,
    registerAssetOnChain: notConnected,
    registerSolOnChain: notConnected,
    depositSolOnChain: notConnected,
    depositTokenOnChain: notConnected,
    sendHeartbeatOnChain: notConnected,
    updateEstateFieldsOnChain: notConnected,
    revokeEstateOnChain: notConnected,
    updateHeirOnChain: notConnected,
    clearVault: () => {},
  };
  return <VaultContext.Provider value={stubValue}>{children}</VaultContext.Provider>;
};

// ---------------------------------------------------------------------------
// Public provider
// ---------------------------------------------------------------------------

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

// eslint-disable-next-line react-refresh/only-export-components
export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
};
