import { useEffect, useState } from "react";
import { address as toAddress, type Address } from "@solana/kit";
import { useWallet } from "@/contexts/WalletContext";
import {
  TOKEN_PROGRAM_ID,
  USDC_MINT,
  USDC_LABEL,
  USDC_DECIMALS,
  heliusRpcUrl,
} from "@/config/constants";

const TOKEN_2022_PROGRAM_ID = toAddress("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export interface SplTokenAsset {
  mint: string;
  label: string;
  name?: string;
  symbol?: string;
  image?: string;
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

function fallbackLabel(mint: string, decimals: number): string {
  if (mint === USDC_MINT.toString() && decimals === USDC_DECIMALS) return USDC_LABEL;
  return shortMint(mint);
}

type DasFile = { uri?: string; cdn_uri?: string; mime?: string };
type DasMetadata = { name?: string; symbol?: string };
type DasLinks = { image?: string };
type DasContent = { metadata?: DasMetadata; links?: DasLinks; files?: DasFile[] };
type DasTokenInfo = { symbol?: string };
type DasAsset = {
  id?: string;
  content?: DasContent;
  token_info?: DasTokenInfo;
};

function pickImage(content?: DasContent): string | undefined {
  const file = content?.files?.find((f) => !f.mime || f.mime.startsWith("image/"));
  return file?.cdn_uri || content?.links?.image || file?.uri;
}

async function fetchAssetBatch(
  url: string,
  ids: string[],
  signal: AbortSignal,
): Promise<Map<string, DasAsset>> {
  const out = new Map<string, DasAsset>();
  if (ids.length === 0) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 1000) chunks.push(ids.slice(i, i + 1000));

  for (const chunk of chunks) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "heirloom-token-metadata",
        method: "getAssetBatch",
        params: { ids: chunk },
      }),
    });
    if (!res.ok) throw new Error(`Helius ${res.status}`);
    const json = (await res.json()) as { result?: Array<DasAsset | null> };
    const items = Array.isArray(json.result) ? json.result : [];
    items.forEach((item, idx) => {
      if (!item) return;
      const mint = item.id ?? chunk[idx];
      if (!mint) return;
      out.set(mint, item);
    });
  }
  return out;
}

export function useWalletSplTokens(ownerStr: string | null): HookState {
  const { rpc } = useWallet();
  const [state, setState] = useState<HookState>({ tokens: [], loading: false, error: null });

  useEffect(() => {
    if (!ownerStr) {
      setState({ tokens: [], loading: false, error: null });
      return;
    }
    const ac = new AbortController();
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
              label: fallbackLabel(mint, decimals),
              decimals,
              rawAmount: (prev?.rawAmount ?? 0n) + raw,
              uiAmount: 0,
              tokenProgram: programs[idx].name,
            };
            next.uiAmount = Number(next.rawAmount) / Math.pow(10, decimals);
            byMint.set(mint, next);
          }
        });

        const initial = Array.from(byMint.values()).sort((a, b) => b.uiAmount - a.uiAmount);

        if (!cancelled) {
          setState({ tokens: initial, loading: true, error: null });
        }

        const heliusUrl = heliusRpcUrl();
        if (heliusUrl && initial.length > 0) {
          try {
            const meta = await fetchAssetBatch(
              heliusUrl,
              initial.map((t) => t.mint),
              ac.signal,
            );
            if (cancelled) return;
            const enriched = initial.map((t) => {
              const m = meta.get(t.mint);
              if (!m) return t;
              const name = m.content?.metadata?.name?.trim() || undefined;
              const symbol =
                m.token_info?.symbol?.trim() ||
                m.content?.metadata?.symbol?.trim() ||
                undefined;
              const image = pickImage(m.content);
              const label =
                symbol ||
                name ||
                fallbackLabel(t.mint, t.decimals);
              return { ...t, name, symbol, image, label };
            });
            if (!cancelled) {
              setState({ tokens: enriched, loading: false, error: null });
            }
          } catch (metaErr) {
            if (!cancelled) {
              setState({
                tokens: initial,
                loading: false,
                error:
                  metaErr instanceof Error ? `Metadata: ${metaErr.message}` : null,
              });
            }
          }
        } else if (!cancelled) {
          setState({ tokens: initial, loading: false, error: null });
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
      ac.abort();
    };
  }, [ownerStr, rpc]);

  return state;
}
