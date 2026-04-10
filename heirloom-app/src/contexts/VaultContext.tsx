import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "./WalletContext";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  fetchVaultAccount,
  createVault as createVaultContract,
  deposit as depositContract,
  sendHeartbeat as sendHeartbeatContract,
  emergencyWithdraw as emergencyWithdrawContract,
} from "@/lib/contracts";
import { TOKEN_A_MINT, TOKEN_B_MINT } from "@/config/constants";

export interface Heir {
  address: string;
  label: string;
  splitBps: number;
  hasClaimed?: boolean;
}

export interface VaultData {
  state: "active" | "grace" | "claimable" | "distributed";
  tokenABalance: number;
  tokenBBalance: number;
  lastHeartbeat: number;
  heartbeatInterval: number;
  gracePeriod: number;
  elapsedSeconds: number;
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
  heirCount: number;
  guardian: string | null;
  guardianPauseUsed: boolean;
  isDistributed: boolean;
  createdAt: number;
  heirs: Heir[];
  tokenAMint: string;
  tokenBMint: string;
}

interface VaultState {
  vault: VaultData | null;
  loading: boolean;
  error: string | null;
  pendingTxId: string | null;
  pendingCreate: boolean;
  fetchVault: () => Promise<void>;
  createVaultOnChain: (
    heartbeatInterval: number,
    gracePeriod: number,
    heirs: { address: string; label: string; splitBps: number }[],
    guardian?: string
  ) => Promise<string>;
  depositTokenAOnChain: (amount: number) => Promise<string>;
  depositTokenBOnChain: (amount: number) => Promise<string>;
  sendHeartbeatOnChain: () => Promise<string>;
  emergencyWithdrawOnChain: () => Promise<string>;
  clearVault: () => void;
}

const VaultContext = createContext<VaultState | null>(null);

function computeVaultState(
  lastHeartbeat: number,
  heartbeatInterval: number,
  gracePeriod: number,
  guardianPauseUsed: boolean,
  isDistributed: boolean
): { state: "active" | "grace" | "claimable" | "distributed"; elapsed: number; untilGrace: number; untilClaimable: number } {
  if (isDistributed) {
    return { state: "distributed", elapsed: 0, untilGrace: 0, untilClaimable: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastHeartbeat;
  const pauseBonus = guardianPauseUsed ? 2592000 : 0;
  const deadline = heartbeatInterval + gracePeriod + pauseBonus;

  if (elapsed >= deadline) {
    return { state: "claimable", elapsed, untilGrace: 0, untilClaimable: 0 };
  } else if (elapsed >= heartbeatInterval) {
    return {
      state: "grace",
      elapsed,
      untilGrace: 0,
      untilClaimable: deadline - elapsed,
    };
  } else {
    return {
      state: "active",
      elapsed,
      untilGrace: heartbeatInterval - elapsed,
      untilClaimable: deadline - elapsed,
    };
  }
}

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { publicKey, isConnected, connection, wallet: solWallet } = useWallet();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getProvider = useCallback((): AnchorProvider => {
    return new AnchorProvider(connection, solWallet as never, { commitment: "confirmed" });
  }, [connection, solWallet]);

  const fetchVault = useCallback(async () => {
    if (!publicKey) return;
    try {
      setLoading(true);
      setError(null);
      const ownerPk = new PublicKey(publicKey);
      const vaultAccount = await fetchVaultAccount(connection, ownerPk);

      if (!vaultAccount) {
        setVault(null);
        return;
      }

      const lastHB = vaultAccount.lastHeartbeat.toNumber();
      const interval = vaultAccount.heartbeatInterval.toNumber();
      const grace = vaultAccount.gracePeriod.toNumber();
      const { state, elapsed, untilGrace, untilClaimable } = computeVaultState(
        lastHB,
        interval,
        grace,
        vaultAccount.guardianPauseUsed,
        vaultAccount.isDistributed
      );

      // If vault is distributed, treat as no vault so owner can create a new one
      const allClaimed =
        vaultAccount.heirs.length > 0 &&
        vaultAccount.heirs.filter((h) => h.isActive).every((h) => h.hasClaimed);
      if (vaultAccount.isDistributed || allClaimed) {
        setVault(null);
        return;
      }

      const heirs: Heir[] = vaultAccount.heirs
        .filter((h) => h.isActive)
        .map((h, i) => ({
          address: h.heir.toBase58(),
          label: `Heir ${i + 1}`,
          splitBps: h.splitBps,
          hasClaimed: h.hasClaimed,
        }));

      setVault({
        state,
        tokenABalance: vaultAccount.tokenABalance.toNumber(),
        tokenBBalance: vaultAccount.tokenBBalance.toNumber(),
        lastHeartbeat: lastHB,
        heartbeatInterval: interval,
        gracePeriod: grace,
        elapsedSeconds: elapsed,
        secondsUntilGrace: untilGrace,
        secondsUntilClaimable: untilClaimable,
        heirCount: vaultAccount.heirCount,
        guardian: vaultAccount.guardian?.toBase58() ?? null,
        guardianPauseUsed: vaultAccount.guardianPauseUsed,
        isDistributed: vaultAccount.isDistributed,
        createdAt: vaultAccount.createdAt.toNumber(),
        heirs,
        tokenAMint: vaultAccount.tokenAMint.toBase58(),
        tokenBMint: vaultAccount.tokenBMint.toBase58(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch vault";
      if (msg.includes("Account does not exist")) {
        setVault(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  // Clear pendingCreate once vault is found
  useEffect(() => {
    if (vault) {
      setPendingCreate(false);
    }
  }, [vault]);

  // Auto-poll: 5s when pending creation, 15s otherwise
  useEffect(() => {
    if (isConnected && publicKey) {
      fetchVault();
      const interval = pendingCreate ? 5000 : 15000;
      pollRef.current = setInterval(fetchVault, interval);
    } else {
      setVault(null);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isConnected, publicKey, fetchVault, pendingCreate]);

  const createVaultOnChain = useCallback(
    async (
      heartbeatInterval: number,
      gracePeriod: number,
      heirs: { address: string; label: string; splitBps: number }[],
      guardian?: string
    ): Promise<string> => {
      const provider = getProvider();
      const txId = await createVaultContract(
        provider,
        heartbeatInterval,
        gracePeriod,
        heirs.map((h) => ({ address: h.address, splitBps: h.splitBps })),
        TOKEN_A_MINT,
        TOKEN_B_MINT,
        guardian
      );
      setPendingTxId(txId);
      setPendingCreate(true);
      return txId;
    },
    [getProvider]
  );

  const depositTokenAOnChain = useCallback(
    async (amount: number): Promise<string> => {
      const provider = getProvider();
      const txId = await depositContract(provider, TOKEN_A_MINT, amount);
      setPendingTxId(txId);
      return txId;
    },
    [getProvider]
  );

  const depositTokenBOnChain = useCallback(
    async (amount: number): Promise<string> => {
      const provider = getProvider();
      const txId = await depositContract(provider, TOKEN_B_MINT, amount);
      setPendingTxId(txId);
      return txId;
    },
    [getProvider]
  );

  const sendHeartbeatOnChain = useCallback(async (): Promise<string> => {
    const provider = getProvider();
    const txId = await sendHeartbeatContract(provider);
    setPendingTxId(txId);
    return txId;
  }, [getProvider]);

  const emergencyWithdrawOnChain = useCallback(async (): Promise<string> => {
    const provider = getProvider();
    const txId = await emergencyWithdrawContract(provider, TOKEN_A_MINT, TOKEN_B_MINT);
    setPendingTxId(txId);
    return txId;
  }, [getProvider]);

  const clearVault = useCallback(() => {
    setVault(null);
    setPendingTxId(null);
    setPendingCreate(false);
    setError(null);
  }, []);

  return (
    <VaultContext.Provider
      value={{
        vault,
        loading,
        error,
        pendingTxId,
        pendingCreate,
        fetchVault,
        createVaultOnChain,
        depositTokenAOnChain,
        depositTokenBOnChain,
        sendHeartbeatOnChain,
        emergencyWithdrawOnChain,
        clearVault,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
};
