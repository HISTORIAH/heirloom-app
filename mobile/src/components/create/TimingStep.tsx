import { Text, View } from "react-native";

import { AddressField } from "@/components/create/AddressField";
import { ErrorLine, StepHead } from "@/components/create/WizardChrome";
import { Icon, type IconName } from "@/components/Icon";
import { Cap, Chip, PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { CHECK_IN_CHOICES, WAIT_CHOICES } from "@/constants/estate";
import { dateShort, shortAddress } from "@/lib";

/** Enough 3px stripes to cover the widest segment; the rest is clipped. */
const STRIPES = 64;

function Stripes({ flex, color, ruled }: { flex: number; color: string; ruled?: boolean }) {
  return (
    <View
      style={{
        flex,
        flexDirection: "row",
        gap: 3,
        overflow: "hidden",
        borderRadius: 6,
        borderWidth: ruled ? space.rule : 0,
        borderColor: colors.ink,
      }}
    >
      {Array.from({ length: STRIPES }, (_, i) => (
        <View key={i} style={{ width: 3, backgroundColor: color }} />
      ))}
    </View>
  );
}

function Extra({
  icon,
  title,
  body,
  value,
  open,
  error,
  onOpen,
  onRemove,
  onChange,
  onScan,
}: {
  icon: IconName;
  title: string;
  body: string;
  value: string;
  open: boolean;
  error?: string;
  onOpen: () => void;
  onRemove: () => void;
  onChange: (next: string) => void;
  onScan: () => void;
}) {
  const set = value.trim().length > 0;
  return (
    <View
      style={{
        paddingVertical: 12,
        borderTopWidth: space.rule,
        borderTopColor: colors.line,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon name={icon} size={20} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>{title}</Text>
          <Text
            style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}
          >
            {set && !open ? shortAddress(value.trim()) : body}
          </Text>
        </View>
        <PrimaryButton
          compact
          tone="paper"
          label={open || set ? "Remove" : "Add"}
          onPress={open || set ? onRemove : onOpen}
        />
      </View>
      {open ? (
        <AddressField
          label={`${title} address`}
          value={value}
          error={error}
          onChange={onChange}
          onScan={onScan}
        />
      ) : null}
    </View>
  );
}

export function TimingStep({
  everyDays,
  waitDays,
  signer,
  guardian,
  signerOpen,
  guardianOpen,
  signerError,
  guardianError,
  timingError,
  onEvery,
  onWait,
  onSigner,
  onGuardian,
  onSignerOpen,
  onGuardianOpen,
  onScan,
}: {
  everyDays: number;
  waitDays: number;
  signer: string;
  guardian: string;
  signerOpen: boolean;
  guardianOpen: boolean;
  signerError?: string;
  guardianError?: string;
  timingError?: string;
  onEvery: (days: number) => void;
  onWait: (days: number) => void;
  onSigner: (next: string) => void;
  onGuardian: (next: string) => void;
  onSignerOpen: (open: boolean) => void;
  onGuardianOpen: (open: boolean) => void;
  onScan: (target: "signer" | "guardian") => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <StepHead eyebrow="Step 3 · Check-in" title="How often will you check in?" />
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}>
        {CHECK_IN_CHOICES.map((days) => (
          <Chip
            key={days}
            label={`${days}d`}
            on={everyDays === days}
            onPress={() => onEvery(days)}
          />
        ))}
      </View>

      <Text style={{ marginTop: 4, fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
        Then your heir waits
      </Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}>
        {WAIT_CHOICES.map((days) => (
          <Chip key={days} label={`${days}d`} on={waitDays === days} onPress={() => onWait(days)} />
        ))}
      </View>
      <ErrorLine>{timingError}</ErrorLine>

      <View
        accessibilityLabel="Timeline"
        style={{
          gap: 10,
          padding: 14,
          borderRadius: 18,
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
        }}
      >
        <View accessible={false} style={{ flexDirection: "row", height: 28, gap: 3 }}>
          <Stripes flex={everyDays} color={colors.ink} />
          <Stripes flex={Math.max(waitDays, 1)} color={colors.yellow} ruled />
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.ink }}>
          Check in by <Text style={{ fontFamily: font.bold }}>{dateShort(everyDays)}</Text>. Miss
          it, and your heir can claim from{" "}
          <Text style={{ fontFamily: font.bold }}>{dateShort(everyDays + waitDays)}</Text>.
        </Text>
      </View>

      <View style={{ marginTop: 2 }}>
        <Cap>Extra protection · optional</Cap>
      </View>
      <View>
        <Extra
          icon="clock"
          title="Check-in signer"
          body="A separate hot wallet checks in, so this one stays cold."
          value={signer}
          open={signerOpen}
          error={signerError}
          onOpen={() => onSignerOpen(true)}
          onRemove={() => {
            onSigner("");
            onSignerOpen(false);
          }}
          onChange={onSigner}
          onScan={() => onScan("signer")}
        />
        <Extra
          icon="shield"
          title="Guardian"
          body="Someone who can pause the countdown."
          value={guardian}
          open={guardianOpen}
          error={guardianError}
          onOpen={() => onGuardianOpen(true)}
          onRemove={() => {
            onGuardian("");
            onGuardianOpen(false);
          }}
          onChange={onGuardian}
          onScan={() => onScan("guardian")}
        />
      </View>
    </View>
  );
}
