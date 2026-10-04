import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/Icon";
import { Cap, PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { Address } from "@solana/kit";
import { SECONDS_PER_DAY } from "@/constants/time";
import { LABEL_MAX_LEN, MAX_INTERVAL_DAYS } from "@/constants/estate";
import { EstateRow } from "@/types/program";
import { isPausedNow, parseAddress } from "@/lib";

type EverydayAction = "heir" | "timing" | "rename";

const EVERYDAY: Record<EverydayAction, { title: string; fallback?: string }> = {
  heir: {
    title: "Change heir",
  },
  timing: {
    title: "Update timing",
    fallback: "Check-in, grace, and pause length",
  },
  rename: {
    title: "Rename",
  },
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  editable,
  maxLength,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "decimal-pad";
  editable?: boolean;
  maxLength?: number;
  hint?: string;
  error?: string;
}) {
  return (
    <View>
      <Cap>{label}</Cap>
      {hint ? (
        <Text
          style={{
            marginTop: 4,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          {hint}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        editable={editable}
        maxLength={maxLength}
        placeholderTextColor={colors.mute}
        style={{
          marginTop: 8,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 2,
          borderColor: error !== undefined ? colors.claim : colors.ink,
          borderRadius: space.radiusBtn,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.ink,
          backgroundColor: colors.paper,
        }}
      />
      {error !== undefined ? (
        <Text
          style={{
            marginTop: 6,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 12,
            color: colors.claim,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function FormIssue({ text }: { text?: string }) {
  if (text === undefined) return null;
  return (
    <Text
      style={{
        fontFamily: "SpaceGrotesk_600SemiBold",
        fontSize: 12,
        color: colors.claim,
      }}
    >
      {text}
    </Text>
  );
}

function daysFromSeconds(seconds: bigint | number): string {
  return String(Math.round(Number(seconds) / SECONDS_PER_DAY));
}

function parseDayCount(text: string, label: string, allowZero: boolean): bigint {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error(`Enter ${label} in whole days`);
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) throw new Error(`Enter ${label} in whole days`);
  if (!allowZero && n < 1) throw new Error(`${label} must be at least 1 day`);
  if (n > MAX_INTERVAL_DAYS) {
    throw new Error(`${label} cannot exceed ${MAX_INTERVAL_DAYS} days`);
  }
  return BigInt(n) * BigInt(SECONDS_PER_DAY);
}

function changedDayField(
  text: string,
  onChain: bigint | number,
  label: string,
  allowZero: boolean,
): bigint | undefined {
  if (text === daysFromSeconds(onChain)) return undefined;
  const next = parseDayCount(text, label, allowZero);
  if (next === BigInt(onChain)) return undefined;
  return next;
}

function collectTimingFields(
  row: EstateRow,
  heartbeat: string,
  grace: string,
  pause: string,
): {
  checkInIntervalSecs?: bigint;
  gracePeriodSecs?: bigint;
  delegatePauseDurationSecs?: bigint;
} {
  const checkInIntervalSecs = changedDayField(
    heartbeat,
    row.data.checkInIntervalSecs,
    "check-in",
    false,
  );
  const gracePeriodSecs = changedDayField(grace, row.data.gracePeriodSecs, "grace", false);
  const delegatePauseDurationSecs = changedDayField(
    pause,
    row.data.delegatePauseDurationSecs,
    "pause",
    true,
  );
  const fields: {
    checkInIntervalSecs?: bigint;
    gracePeriodSecs?: bigint;
    delegatePauseDurationSecs?: bigint;
  } = {};
  if (checkInIntervalSecs !== undefined) fields.checkInIntervalSecs = checkInIntervalSecs;
  if (gracePeriodSecs !== undefined) fields.gracePeriodSecs = gracePeriodSecs;
  if (delegatePauseDurationSecs !== undefined)
    fields.delegatePauseDurationSecs = delegatePauseDurationSecs;
  if (Object.keys(fields).length === 0) {
    throw new Error("Nothing changed");
  }
  return fields;
}

function EverydayRow({
  action,
  desc,
  danger,
  disabled,
  onPress,
}: {
  action: EverydayAction | "close";
  desc?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const title = action === "close" ? "Close estate" : EVERYDAY[action].title;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        paddingVertical: 12,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        borderBottomWidth: space.rule,
        borderBottomColor: colors.line,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 15,
            color: danger ? colors.claim : colors.ink,
          }}
        >
          {title}
        </Text>
        {desc !== undefined ? (
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 13,
              lineHeight: 18,
              color: colors.mute,
            }}
          >
            {desc}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" size={18} weight={2} />
    </Pressable>
  );
}

type EstateManageProps = {
  row: EstateRow;
  busy?: boolean;
  onReassign: (newHeir: Address) => void;
  onTiming: (fields: {
    checkInIntervalSecs?: bigint;
    gracePeriodSecs?: bigint;
    delegatePauseDurationSecs?: bigint;
  }) => void;
  onClose: () => void;
  onRename?: (name: string) => Promise<void>;
};

function HeirForm({
  busy,
  paused,
  onSubmit,
}: {
  busy?: boolean;
  paused: boolean;
  onSubmit: (heir: Address) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <View
      style={{ paddingVertical: 14, gap: 12, borderBottomWidth: 2, borderBottomColor: colors.line }}
    >
      <Field
        label="New heir"
        value={raw}
        onChangeText={(value) => {
          setError(undefined);
          setRaw(value);
        }}
        editable={!busy && !paused}
        error={error}
      />
      {paused ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          This estate is paused. Wait until the pause ends.
        </Text>
      ) : null}
      <PrimaryButton
        label={busy ? "Working…" : "Change heir"}
        tone="ink"
        disabled={busy || paused}
        onPress={() => {
          try {
            if (paused) {
              throw new Error("This estate is paused. Wait until the pause ends.");
            }
            onSubmit(parseAddress(raw, "heir"));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Check the address");
          }
        }}
      />
    </View>
  );
}

function RenameForm({
  row,
  busy,
  onSubmit,
}: {
  row: EstateRow;
  busy?: boolean;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(row.label ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= LABEL_MAX_LEN;

  return (
    <View
      style={{ paddingVertical: 14, gap: 12, borderBottomWidth: 2, borderBottomColor: colors.line }}
    >
      <Field
        label="Estate name"
        value={name}
        onChangeText={(value) => {
          setError(undefined);
          setName(value);
        }}
        editable={!busy && !saving}
        maxLength={LABEL_MAX_LEN}
        hint={`Max ${LABEL_MAX_LEN} characters`}
        error={error}
      />
      <PrimaryButton
        label={saving || busy ? "Working…" : "Save name"}
        tone="ink"
        disabled={busy || saving || !valid}
        onPress={() => {
          void (async () => {
            setSaving(true);
            try {
              await onSubmit(trimmed);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not save name");
            } finally {
              setSaving(false);
            }
          })();
        }}
      />
    </View>
  );
}

function TimingForm({
  row,
  busy,
  onSubmit,
}: {
  row: EstateRow;
  busy?: boolean;
  onSubmit: EstateManageProps["onTiming"];
}) {
  const [heartbeat, setHeartbeat] = useState(daysFromSeconds(row.data.checkInIntervalSecs));
  const [grace, setGrace] = useState(daysFromSeconds(row.data.gracePeriodSecs));
  const [pause, setPause] = useState(daysFromSeconds(row.data.delegatePauseDurationSecs));
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <View
      style={{ paddingVertical: 14, gap: 12, borderBottomWidth: 2, borderBottomColor: colors.line }}
    >
      <Field
        label="Check-in days"
        value={heartbeat}
        onChangeText={(value) => {
          setError(undefined);
          setHeartbeat(value);
        }}
        keyboardType="decimal-pad"
        editable={!busy}
        hint={`1–${MAX_INTERVAL_DAYS} days`}
      />
      <Field
        label="Grace days"
        value={grace}
        onChangeText={(value) => {
          setError(undefined);
          setGrace(value);
        }}
        keyboardType="decimal-pad"
        editable={!busy}
        hint={`1–${MAX_INTERVAL_DAYS} days`}
      />
      <Field
        label="Pause days"
        value={pause}
        onChangeText={(value) => {
          setError(undefined);
          setPause(value);
        }}
        keyboardType="decimal-pad"
        editable={!busy}
        hint={`0–${MAX_INTERVAL_DAYS} days`}
      />
      <FormIssue text={error} />
      <PrimaryButton
        label={busy ? "Working…" : "Save timing"}
        tone="ink"
        disabled={busy}
        onPress={() => {
          try {
            onSubmit(collectTimingFields(row, heartbeat, grace, pause));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Check the form");
          }
        }}
      />
    </View>
  );
}

export function EstateManage({
  row,
  busy,
  onReassign,
  onTiming,
  onClose,
  onRename,
}: EstateManageProps) {
  const [open, setOpen] = useState<EverydayAction | undefined>(undefined);
  const intervalDays = Math.round(Number(row.data.checkInIntervalSecs) / SECONDS_PER_DAY);
  const graceDays = Math.round(Number(row.data.gracePeriodSecs) / SECONDS_PER_DAY);
  const paused = isPausedNow(row.data.delegatePauseExpiresAt);

  function toggle(action: EverydayAction) {
    if (busy) return;
    setOpen((current) => (current === action ? undefined : action));
  }

  return (
    <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
      <EverydayRow action="heir" disabled={busy} onPress={() => toggle("heir")} />
      {open === "heir" ? <HeirForm busy={busy} paused={paused} onSubmit={onReassign} /> : null}
      <EverydayRow
        action="timing"
        desc={`Every ${intervalDays} days · ${graceDays}-day grace`}
        disabled={busy}
        onPress={() => toggle("timing")}
      />
      {open === "timing" ? <TimingForm row={row} busy={busy} onSubmit={onTiming} /> : null}
      {onRename ? (
        <>
          <EverydayRow action="rename" disabled={busy} onPress={() => toggle("rename")} />
          {open === "rename" ? <RenameForm row={row} busy={busy} onSubmit={onRename} /> : null}
        </>
      ) : null}
      <EverydayRow action="close" desc="0.5% fee" danger disabled={busy} onPress={onClose} />
    </View>
  );
}
