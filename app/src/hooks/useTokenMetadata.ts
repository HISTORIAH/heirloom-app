import { useEffect, useMemo, useState } from "react";
import { fetchAssetBatch, pickImage } from "@/lib/heliusDas";
import { heliusRpcUrl } from "@/config/constants";

export interface TokenMetadata {
  symbol?: string;
  name?: string;
  image?: string;
}

interface HookState {
  metadata: Map<string, TokenMetadata>;
  loading: boolean;
  error: string | null;
}

const EMPTY: HookState = { metadata: new Map(), loading: false, error: null };

export function useTokenMetadata(mints: string[]): HookState {
  const key = useMemo(() => {
    const unique = Array.from(new Set(mints.filter(Boolean)));
    unique.sort();
    return unique.join(",");
  }, [mints]);

  const [state, setState] = useState<HookState>(EMPTY);

  useEffect(() => {
    if (!key) {
      setState(EMPTY);
      return;
    }
    const url = heliusRpcUrl();
    if (!url) {
      setState(EMPTY);
      return;
    }
    const ids = key.split(",");
    const ac = new AbortController();
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const raw = await fetchAssetBatch(url, ids, ac.signal);
        if (cancelled) return;
        const next = new Map<string, TokenMetadata>();
        raw.forEach((asset, mint) => {
          const symbol =
            asset.token_info?.symbol?.trim() ||
            asset.content?.metadata?.symbol?.trim() ||
            undefined;
          const name = asset.content?.metadata?.name?.trim() || undefined;
          const image = pickImage(asset.content);
          next.set(mint, { symbol, name, image });
        });
        setState({ metadata: next, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({
          metadata: new Map(),
          loading: false,
          error: e instanceof Error ? e.message : "Metadata fetch failed",
        });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [key]);

  return state;
}
