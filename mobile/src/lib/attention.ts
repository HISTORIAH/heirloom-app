import { ATTENTION_DUE_DAYS } from "@/constants/alerts";
import { estateSpan } from "@/lib/estate/span";
import { estateName } from "@/lib/estate/summary";
import { plural } from "@/lib/text";
import { contactState, remindersOn } from "@/lib/reminders";
import { colors } from "@/theme";
import type { EstateUiState } from "@/types/estate";
import type { EstateRow } from "@/types/program";
import type { AttentionItem, EstateReminders } from "@/types/reminders";

function checkInText(
  state: EstateUiState,
  daysUntilCheckIn: number,
  daysUntilClaim: number,
): string {
  if (state === "claimable") return "Your heir can claim now";
  if (state === "grace") return `In grace · heir can claim in ${plural(daysUntilClaim, "day")}`;
  if (daysUntilCheckIn === 0) return "Check-in due today";
  return `Check-in due in ${plural(daysUntilCheckIn, "day")}`;
}

/**
 * What needs the owner across their estates, most urgent first: check-ins due within a week,
 * in grace or past it (from the chain), then reminders that are off or have no heir contact
 * (only known once signed in). Claimed estates are left out.
 */
export function needsAttention(rows: EstateRow[], reminders: EstateReminders[]): AttentionItem[] {
  const chain: (AttentionItem & { rank: number })[] = [];
  const contacts: AttentionItem[] = [];

  for (const row of rows) {
    const span = estateSpan(row.data, row.claimableLamports);
    if (span.state === "distributed") continue;
    const estateAddress = String(row.address);
    const name = estateName(row);

    if (span.state !== "active" || span.daysUntilCheckIn <= ATTENTION_DUE_DAYS) {
      chain.push({
        key: `${estateAddress}:check-in`,
        estateAddress,
        estateName: name,
        text: checkInText(span.state, span.daysUntilCheckIn, span.daysUntilClaim),
        action: "check-in",
        actionLabel: "Check in",
        fill: span.slab,
        // Claimable before grace before due-soon; sooner first within each.
        rank:
          span.state === "claimable"
            ? -1
            : span.state === "grace"
              ? span.daysUntilClaim
              : 1000 + span.daysUntilCheckIn,
      });
    }

    const r = reminders.find((item) => item.estateAddress === estateAddress);
    if (r === undefined || r.status !== "ready") continue;
    if (!remindersOn(r.recipients)) {
      contacts.push({
        key: `${estateAddress}:off`,
        estateAddress,
        estateName: name,
        text: "Reminders are off",
        action: "reminders",
        actionLabel: "Set up",
        fill: colors.paper,
      });
    }
    if (contactState(r.recipients, "heir").kind === "none") {
      contacts.push({
        key: `${estateAddress}:heir`,
        estateAddress,
        estateName: name,
        text: "No contact for your heir",
        action: "reminders",
        actionLabel: "Add",
        fill: colors.paper,
      });
    }
  }

  chain.sort((a, b) => a.rank - b.rank);
  return [...chain.map(({ rank: _rank, ...item }) => item), ...contacts];
}
