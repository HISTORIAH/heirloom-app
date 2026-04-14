import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import { useWalletUi, useWalletUiSigner } from "@wallet-ui/react";
import { useWallet } from "./WalletContext";
import {
  fetchEstateByPair,
  getVaultAddress,
  sendInitialize,
  sendRevoke,
  sendUpdate,
  type Client,
} from "@/lib/contracts";

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
  mint: string | null;
  estatePda: string;
  vaultPda: string;
  solBalance: number;
  state: "active" | "grace" | "claimable" | "distributed";
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
}

export interface CreateEstateInput {
  heir: string;
  label: string;
  heartbeatInterval: number;
  gracePeriod: number;
  pauseDuration: number;
  amountLamports: bigint;
  delegate?: string;
  mint?: string;
}

interface VaultState {
  estates: EstateData[];
  loading: boolean;
  error: string | null;
  pendingTxId: string | null;
  pendingCreate: boolean;
  fetchEstates: () => Promise<void>;
  createEstateOnChain: (input: CreateEstateInput) => Promise<string>;
  sendHeartbeatOnChain: (heir: string) => Promise<string>;
  revokeEstateOnChain: (heir: string, mint?: string) => Promise<string>;
  clearVault: () => void;
}

const VaultContext = createContext<VaultState | null>(null);

const KNOWN_HEIRS_KEY = "heirloom:known-heirs";

function loadKnownHeirs(authority: string): string[] {
  try {
    const raw = localStorage.getItem(`${KNOWN_HEIRS_KEY}:${authority}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveKnownHeirs(authority: string, heirs: string[]) {
  try {
    localStorage.setItem(`${KNOWN_HEIRS_KEY}:${authority}`, JSON.stringify(heirs));
  } catch {
    // ignore
  }
}

function computeState(
  lastHeartbeat: number,
  heartbeatInterval: number,
  gracePeriod: number,
  pausedUntil: number,
  isClaimed: boolean,
): { state: EstateData["state"]; secondsUntilGrace: number; secondsUntilClaimable: number } {
  if (isClaimed) {
    return { state: "distributed", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = lastHeartbeat + heartbeatInterval;
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
      const knownHeirs = loadKnownHeirs(authority);
      const results: EstateData[] = [];
      for (const heirStr of knownHeirs) {
        try {
          const heir = toAddress(heirStr);
          const maybe = await fetchEstateByPair(rpc, authority, heir);
          if (!maybe.exists) continue;
          const estatePda = maybe.address;
          const vaultPda = await getVaultAddress(authority, heir);
          const { value: lamports } = await rpc.getBalance(vaultPda).send();
          const lastHeartbeat = Number(maybe.data.lastHeartbeat);
          const heartbeatInterval = Number(maybe.data.heartbeatInterval);
          const gracePeriod = Number(maybe.data.gracePeriod);
          const pausedUntil = Number(maybe.data.pausedUntil);
          const { state, secondsUntilGrace, secondsUntilClaimable } = computeState(
            lastHeartbeat,
            heartbeatInterval,
            gracePeriod,
            pausedUntil,
            maybe.data.isClaimed,
          );
          results.push({
            authority: maybe.data.authority,
            heir: maybe.data.heir,
            label: maybe.data.label,
            heartbeatInterval,
            gracePeriod,
            lastHeartbeat,
            pauseDuration: Number(maybe.data.pauseDuration),
            pausedUntil,
            createdAt: Number(maybe.data.createdAt),
            isClaimed: maybe.data.isClaimed,
            isDeferred: maybe.data.isDeferred,
            delegate:
              maybe.data.delegate && "__option" in maybe.data.delegate
                ? (maybe.data.delegate as { __option: "Some" | "None"; value?: string }).__option === "Some"
                  ? ((maybe.data.delegate as { value: string }).value ?? null)
                  : null
                : null,
            mint:
              maybe.data.mint && "__option" in maybe.data.mint
                ? (maybe.data.mint as { __option: "Some" | "None"; value?: string }).__option === "Some"
                  ? ((maybe.data.mint as { value: string }).value ?? null)
                  : null
                : null,
            estatePda,
            vaultPda,
            solBalance: Number(lamports),
            state,
            secondsUntilGrace,
            secondsUntilClaimable,
          });
        } catch {
          // skip failed heirs
        }
      }
      setEstates(results);
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
      const txId = await sendInitialize(client, {
        authority: signer,
        heir: heirAddress,
        amount: input.amountLamports,
        label: input.label,
        heartbeatInterval: BigInt(input.heartbeatInterval),
        gracePeriod: BigInt(input.gracePeriod),
        pauseDuration: BigInt(input.pauseDuration),
        delegate: input.delegate ? toAddress(input.delegate) : undefined,
        mint: input.mint ? toAddress(input.mint) : undefined,
      });
      const heirs = loadKnownHeirs(authority);
      if (!heirs.includes(input.heir)) {
        heirs.push(input.heir);
        saveKnownHeirs(authority, heirs);
      }
      setPendingTxId(txId);
      setPendingCreate(true);
      return txId;
    },
    [client, signer, authority],
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
    async (heir: string, mint?: string): Promise<string> => {
      const txId = await sendRevoke(client, {
        authority: signer,
        heir: toAddress(heir),
        mint: mint ? toAddress(mint) : undefined,
      });
      const heirs = loadKnownHeirs(authority).filter((h) => h !== heir);
      saveKnownHeirs(authority, heirs);
      setPendingTxId(txId);
      return txId;
    },
    [client, signer, authority],
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
    fetchEstates: async () => {},
    createEstateOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    sendHeartbeatOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    revokeEstateOnChain: async () => {
      throw new Error("Wallet not connected");
    },
    clearVault: () => {},
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
