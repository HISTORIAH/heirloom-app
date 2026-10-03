import { DUE_SOON_DAYS } from "@/constants/estate";
import { estateSpan } from "@/lib/estate/span";
import { registeredTokenCount } from "@/lib/estate/tokens";
import { solLabel } from "@/lib/solana/amount";
import { shortAddress } from "@/lib/solana/address";
import { plural } from "@/lib/text";
import { colors } from "@/theme";
import type { EstateUiState } from "@/types/estate";
import type { EstateRow } from "@/types/program";

const RANK: Record<EstateUiState, number> = {
  claimable: 0,
  grace: 1,
  active: 2,
  distributed: 3,
};

/** Days until the next thing that matters: check-in when active, claim when in grace. */
export function daysToNext(row: EstateRow): number {
  const span = estateSpan(row.data, row.claimableLamports);
  return span.state === "grace" ? span.daysUntilClaim : span.daysUntilCheckIn;
}

/** Claimable, then grace, then soonest check-in. Distributed sinks. */
export function bySoonest(rows: EstateRow[]): EstateRow[] {
  return [...rows].sort((a, b) => {
    const sa = estateSpan(a.data, a.claimableLamports).state;
    const sb = estateSpan(b.data, b.claimableLamports).state;
    if (sa !== sb) return RANK[sa] - RANK[sb];
    return daysToNext(a) - daysToNext(b);
  });
}

export function estateName(row: EstateRow): string {
  return row.label ?? `Estate ${shortAddress(String(row.address))}`;
}

/** "1 SOL · 2 tokens" */
export function assetsLine(row: EstateRow): string {
  const tokens = registeredTokenCount(row.data.claimableAssets);
  const parts = [solLabel(row.claimableLamports)];
  if (tokens > 0) parts.push(plural(tokens, "token"));
  return parts.join(" · ");
}

export function heirLine(row: EstateRow): string {
  return shortAddress(String(row.data.heir));
}

/** Right-hand status tag for list rows: "GRACE 5d", "12d", "CLAIMABLE". */
export function statusTag(row: EstateRow): { label: string; fill: string } {
  const span = estateSpan(row.data, row.claimableLamports);
  if (span.state === "claimable") return { label: "Claimable", fill: colors.claim };
  if (span.state === "distributed") return { label: "Claimed", fill: colors.paper };
  if (span.state === "grace") return { label: `Grace ${span.daysUntilClaim}d`, fill: colors.orange };
  const fill = span.daysUntilCheckIn <= DUE_SOON_DAYS ? colors.yellow : colors.paper;
  return { label: `${span.daysUntilCheckIn}d`, fill };
}
