import { useState } from "react";
import { Text, View } from "react-native";

import { HeirProfileFields } from "@/components/reminders/HeirProfileFields";
import { Note, PrimaryButton } from "@/components/ui";
import { cleanProfile, genericAlert } from "@/lib/reminders";
import { colors, font } from "@/theme";
import type { HeirProfile } from "@/types/reminders";

const EMPTY: HeirProfile = { heirName: null, ownerName: null, note: null };

function same(a: HeirProfile, b: HeirProfile): boolean {
  const x = cleanProfile(a);
  const y = cleanProfile(b);
  return x.heirName === y.heirName && x.ownerName === y.ownerName && x.note === y.note;
}

/**
 * Edits the saved heir profile. Saving sends all three fields, since the PUT replaces them.
 * The parent remounts this (by `key`) when the saved profile changes, so the draft starts fresh.
 */
export function HeirProfileCard({
  saved,
  saving,
  error,
  justSaved,
  onSave,
}: {
  saved: HeirProfile | null;
  saving?: boolean;
  error?: string;
  justSaved?: boolean;
  onSave: (profile: HeirProfile) => void;
}) {
  const [draft, setDraft] = useState<HeirProfile>(saved ?? EMPTY);
  const dirty = !same(draft, saved ?? EMPTY);

  return (
    <View style={{ gap: 14 }}>
      {genericAlert(saved) ? (
        <Note icon="bell">
          Your heir will get a generic message. Add both names so they know it's from you.
        </Note>
      ) : null}
      <HeirProfileFields value={draft} onChange={setDraft} disabled={saving} />
      {error !== undefined ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        tone="paper"
        icon={justSaved && !dirty ? "check" : undefined}
        label={saving ? "Saving…" : justSaved && !dirty ? "Saved" : "Save profile"}
        disabled={saving || !dirty}
        onPress={() => onSave(draft)}
      />
    </View>
  );
}
