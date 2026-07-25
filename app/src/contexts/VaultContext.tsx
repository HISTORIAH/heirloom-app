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
  signer: TransactionSigner | null;
  authority: Address | null;
  children: React.ReactNode;
}> = ({ signer, authority, children }) => {
  const { rpc, rpcSubscriptions } = useWallet();
  const [estates, setEstates] = useState<EstateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const client: HeirloomClient = useMemo(
    () => ({ rpc, rpcSubscriptions }),
    [rpc, rpcSubscriptions],
  );

  const requireAuth = useCallback((): { signer: TransactionSigner; authority: Address } => {
    if (!signer || !authority) throw new Error("Wallet not connected");
    return { signer, authority };
  }, [signer, authority]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchEstates = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!authority) {
      setLoading(false);

      return;
    }
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
          const vaultEmpty =
            estate.data.claimableAssets === 0 && Number(lamports) === 0 && !hasTokenBalance;

          const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
            lastHeartbeat,
            heartbeatInterval,
            gracePeriod,
            pausedUntil,
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
    if (!authority) {
      setEstates([]);
      setPendingTxId(null);
      setPendingCreate(false);
      setError(null);
    }
  }, [authority]);

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
      const { signer, authority } = requireAuth();
      const heirAddress = toAddress(input.heir);
      const estatePda = await getEstateAddress(authority, heirAddress);
      const vaultPda = await getVaultAddress(authority, heirAddress);

      const rawAccountExists = async (pda: Address): Promise<boolean> => {
        try {
          const res = await rpc
            .getAccountInfo(pda, { encoding: "base64", commitment: "confirmed" })
            .send();
          return res?.value != null && res.value.lamports > 0n;
        } catch {
          return false;
        }
      };

      const existing = await fetchEstateByPair(client, authority, heirAddress);
      if (existing.exists && existing.lamports > 0n) {
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
        throw new Error(
          "Prior estate/vault PDAs not yet cleared on-chain. Wait a few seconds and retry.",
        );
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
        const tokenProgram = primaryToken.tokenProgram
          ? toAddress(primaryToken.tokenProgram)
          : undefined;
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
    [client, rpc, requireAuth],
  );

  const registerAssetOnChain = useCallback(
    async (heir: string, token: TokenDeposit): Promise<string> => {
      const { signer } = requireAuth();
      const txId = await registerAsset(client, signer, {
        heir: toAddress(heir),
        mint: toAddress(token.mint),
        amount: token.amount,
        tokenProgram: token.tokenProgram ? toAddress(token.tokenProgram) : undefined,
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, requireAuth],
  );

  const registerSolOnChain = useCallback(
    async (heir: string, lamports: bigint): Promise<string> => {
      const { signer } = requireAuth();
      const txId = await registerSolDeposit(client, signer, {
        heir: toAddress(heir),
        amount: lamports,
      });
      setPendingTxId(txId);
      return txId;
    },
    [client, requireAuth],
  );

  const depositSolOnChain = useCallback(
    async (vaultPda: string, lamports: bigint): Promise<string> => {
      const { signer } = requireAuth();
      const txId = await depositSol(client, signer, toAddress(vaultPda), lamports);
      setPendingTxId(txId);
      return txId;
    },
    [client, requireAuth],
  );

  const depositTokenOnChain = useCallback(
    async (holding: VaultTokenHolding, amount: bigint): Promise<string> => {
      const { signer } = requireAuth();
      const txId = await depositToken(client, signer, holding, amount);
      setPendingTxId(txId);
      return txId;
    },
    [client, requireAuth],
  );

  const sendHeartbeatOnChain = useCallback(
    async (heir: string): Promise<string> => {
      const { signer } = requireAuth();
      const txId = await updateFields(client, signer, { heir: toAddress(heir) });
      setPendingTxId(txId);
      return txId;
    },
    [client, requireAuth],
  );

  const updateEstateFieldsOnChain = useCallback(
    async (heir: string, fields: UpdateEstateFields): Promise<string> => {
      const { signer } = requireAuth();
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
    [client, requireAuth],
  );

  const revokeEstateOnChain = useCallback(
    async (heir: string): Promise<string> => {
      const { signer, authority } = requireAuth();
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
    [client, requireAuth],
  );

  const updateHeirOnChain = useCallback(
    async (heir: string, newHeir: string): Promise<string> => {
      const { signer } = requireAuth();
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
    [client, requireAuth, trackTx],
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
// Public provider
// ---------------------------------------------------------------------------

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const walletUi = useWalletUi() as unknown as VaultUiShim;
  const account = walletUi?.account ?? null;
  const [signerState, setSignerState] = useState<{
    signer: TransactionSigner | null;
    authority: Address | null;
  }>({ signer: null, authority: null });

  const handleCapture = useCallback(
    (state: { signer: TransactionSigner | null; authority: Address | null }) => {
      setSignerState(state);
    },
    [],
  );

  return (
    <VaultProviderInner signer={signerState.signer} authority={signerState.authority}>
      {account && <SignerCapture account={account} onCapture={handleCapture} />}
      {children}
    </VaultProviderInner>
  );
};

const signerAddress = (s: TransactionSigner | null): string | undefined =>
  (s as { address?: string } | null)?.address;

const SignerCapture: React.FC<{
  account: { address: string };
  onCapture: (state: { signer: TransactionSigner | null; authority: Address | null }) => void;
}> = ({ account, onCapture }) => {
  const rawSigner = useWalletUiSigner() as unknown as TransactionSigner;
  const authority = useMemo(() => toAddress(account.address), [account.address]);

  // Stabilise signer reference across renders — only swap when address changes
  const [signer, setSigner] = useState<TransactionSigner | null>(rawSigner ?? null);
  useEffect(() => {
    setSigner((prev) => {
      if (!rawSigner) return null;
      if (prev && signerAddress(prev) === signerAddress(rawSigner)) return prev;
      return rawSigner;
    });
  }, [rawSigner]);

  useEffect(() => {
    onCapture({ signer, authority });
  }, [signer, authority, onCapture]);

  useEffect(() => {
    return () => onCapture({ signer: null, authority: null });
  }, [onCapture]);

  return null;
};
// eslint-disable-next-line react-refresh/only-export-components
export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
};
