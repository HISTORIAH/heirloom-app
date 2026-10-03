import { View } from "react-native";

import { AddressField } from "@/components/create/AddressField";
import { OptionCard } from "@/components/create/OptionCard";
import { ErrorLine, StepHead } from "@/components/create/WizardChrome";
import { TextField } from "@/components/ui";
import type { HeirKind } from "@/types/create";
import { LABEL_MAX_LEN } from "@/constants/estate";
import { shortAddress } from "@/lib";

export function HeirStep({
  kind,
  address,
  addressError,
  credential,
  label,
  labelError,
  onKind,
  onAddress,
  onScan,
  onLabel,
}: {
  kind: HeirKind;
  address: string;
  addressError?: string;
  /** Address read off the credential, once linked. */
  credential?: string;
  label: string;
  labelError?: string;
  onKind: (kind: HeirKind) => void;
  onAddress: (next: string) => void;
  onScan: () => void;
  onLabel: (next: string) => void;
}) {
  const field = (
    <AddressField value={address} error={addressError} onChange={onAddress} onScan={onScan} />
  );

  return (
    <View style={{ gap: 12 }}>
      <StepHead eyebrow="Step 1 · Heir" title="Who inherits this estate?" />

      <OptionCard
        on={kind === "credential"}
        icon="tap"
        title="Give them a Heirloom credential"
        body="A card, ring or band they tap to claim. No wallet, no seed phrase."
        tagAs="badge"
        tag={
          kind !== "credential"
            ? undefined
            : credential !== undefined
              ? `Linked · ····${credential.slice(-4)}`
              : "You’ll set it up next"
        }
        onPress={() => onKind("credential")}
      />
      <OptionCard
        on={kind === "wallet"}
        title="Someone’s wallet"
        body="Scan their QR or paste their address."
        onPress={() => onKind("wallet")}
      >
        {field}
      </OptionCard>
      <OptionCard
        on={kind === "mine"}
        title="My own backup wallet"
        body="Lose this wallet and your backup claims it."
        onPress={() => onKind("mine")}
      >
        {field}
      </OptionCard>

      <View style={{ gap: 6 }}>
        <TextField
          label="Estate name"
          value={label}
          onChangeText={onLabel}
          maxLength={LABEL_MAX_LEN}
          placeholder="e.g. Family estate"
          error={labelError !== undefined}
        />
        <ErrorLine>{labelError}</ErrorLine>
      </View>
    </View>
  );
}

export function heirSummary(kind: HeirKind, address: string): string {
  const short = address.trim().length > 0 ? shortAddress(address.trim()) : "—";
  if (kind === "credential") return `Heirloom credential ····${address.slice(-4)}`;
  if (kind === "mine") return `My backup · ${short}`;
  return short;
}
