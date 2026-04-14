import { useEffect, useState } from "react";
import { address as toAddress, type Address } from "@solana/kit";
import { useWallet } from "@/contexts/WalletContext";
import { TOKEN_PROGRAM_ID, USDC_MINT, USDC_LABEL, USDC_DECIMALS } from "@/config/constants";

const TOKEN_2022_PROGRAM_ID = toAddress("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export interface SplTokenAsset {
  mint: string;
  label: string;
  decimals: number;
  rawAmount: bigint;
  uiAmount: number;
  tokenProgram: string;
}

interface HookState {
  tokens: SplTokenAsset[];
  loading: boolean;
  error: string | null;
}

function shortMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function labelForMint(mint: string, decimals: number): string {
  if (mint === USDC_MINT.toString() && decimals === USDC_DECIMALS) return USDC_LABEL;
  return shortMint(mint);
}

export function useWalletSplTokens(ownerStr: string | null): HookState {
  const { rpc } = useWallet();
  const [state, setState] = useState<HookState>({ tokens: [], loading: false, error: null });

  useEffect(() => {
    if (!ownerStr) {
      setState({ tokens: [], loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const owner = toAddress(ownerStr);
        const programs: Array<{ id: Address; name: string }> = [
          { id: TOKEN_PROGRAM_ID, name: TOKEN_PROGRAM_ID.toString() },
          { id: TOKEN_2022_PROGRAM_ID, name: TOKEN_2022_PROGRAM_ID.toString() },
        ];

        const results = await Promise.allSettled(
          programs.map((p) =>
            rpc
              .getTokenAccountsByOwner(owner, { programId: p.id }, { encoding: "jsonParsed" })
              .send(),
          ),
        );

        type ParsedInfo = {
          mint?: string;
          tokenAmount?: { amount?: string; decimals?: number };
        };
        const byMint = new Map<string, SplTokenAsset>();

        results.forEach((res, idx) => {
          if (res.status !== "fulfilled") return;
          const accounts = res.value.value as unknown as Array<{
            account: { data: { parsed: { info: ParsedInfo } } };
          }>;
          for (const a of accounts) {
            const info = a.account?.data?.parsed?.info;
            const mint = info?.mint;
            const rawStr = info?.tokenAmount?.amount;
            const decimals = info?.tokenAmount?.decimals ?? 0;
            if (!mint || !rawStr) continue;
            const raw = BigInt(rawStr);
            if (raw === 0n) continue;
            const prev = byMint.get(mint);
            const next: SplTokenAsset = {
              mint,
              label: labelForMint(mint, decimals),
              decimals,
              rawAmount: (prev?.rawAmount ?? 0n) + raw,
              uiAmount: 0,
              tokenProgram: programs[idx].name,
            };
            next.uiAmount = Number(next.rawAmount) / Math.pow(10, decimals);
            byMint.set(mint, next);
          }
        });

        if (!cancelled) {
          setState({
            tokens: Array.from(byMint.values()).sort((a, b) => b.uiAmount - a.uiAmount),
            loading: false,
            error: null,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            tokens: [],
            loading: false,
            error: e instanceof Error ? e.message : "Failed to fetch tokens",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerStr, rpc]);

  return state;
}
