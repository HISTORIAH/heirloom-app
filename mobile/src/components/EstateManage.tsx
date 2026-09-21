import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Cap, PrimaryButton } from "@/components/ui";
import { LABEL_MAX_LEN, MAX_INTERVAL_DAYS, SECONDS_PER_DAY } from "@/lib/constants";
import type { EstateRow } from "@/lib/estates";
import { uiAmountToRaw } from "@/lib/lamports";
import {
  assertMintUnregistered,
  assertWalletCanDeposit,
  fetchMintMeta,
  isPausedNow,
  trimmedLabel,
} from "@/lib/manageWrites";
import { parseAddress } from "@/lib/ownerWrites";
import { colors, space } from "@/theme";
import type { Address, Rpc, SolanaRpcApi } from "@solana/kit";

type EverydayAction = "heir" | "timing" | "asset";

const EVERYDAY: Record<
  EverydayAction,
  { title: string; consequence: string }
> = {
  heir: {
    title: "Change heir",
    consequence: "Moves the vault to a new estate. The check-in signer stays.",
  },
  timing: {
    title: "Update timing",
    consequence: "Changes check-in, grace, the guardian pause length, and the label",
  },
  asset: {
    title: "Add asset",
    consequence: "Register a new SPL mint in the vault. Not a top-up.",
  },
};

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5.5L15.5 12 9 18.5"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
          borderWidth: 1,
          borderColor: error !== undefined ? colors.claim : colors.line,
          borderRadius: space.radiusBtn,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.ink,
          backgroundColor: colors.bg,
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
  label: string,
  heartbeat: string,
  grace: string,
  pause: string,
): {
  heartbeatInterval?: bigint;
  gracePeriod?: bigint;
  pauseDuration?: bigint;
  label?: string;
} {
  const nextLabel = trimmedLabel(label);
  const heartbeatInterval = changedDayField(
    heartbeat,
    row.data.heartbeatInterval,
    "check-in",
    false,
  );
  const gracePeriod = changedDayField(grace, row.data.gracePeriod, "grace", false);
  const pauseDuration = changedDayField(pause, row.data.pauseDuration, "pause", true);
  const fields: {
    heartbeatInterval?: bigint;
    gracePeriod?: bigint;
    pauseDuration?: bigint;
    label?: string;
  } = {};
  if (heartbeatInterval !== undefined) fields.heartbeatInterval = heartbeatInterval;
  if (gracePeriod !== undefined) fields.gracePeriod = gracePeriod;
  if (pauseDuration !== undefined) fields.pauseDuration = pauseDuration;
  if (nextLabel !== row.data.label.trim()) fields.label = nextLabel;
  if (Object.keys(fields).length === 0) {
    throw new Error("Nothing changed");
  }
  return fields;
}

function EverydayRow({
  action,
  last,
  selected,
  disabled,
  onPress,
}: {
  action: EverydayAction;
  last?: boolean;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const copy = EVERYDAY[action];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={copy.title}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        backgroundColor: selected ? colors.soft : colors.bg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 16,
            letterSpacing: -0.2,
            color: colors.ink,
          }}
        >
          {copy.title}
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          {copy.consequence}
        </Text>
      </View>
      <Chevron />
    </Pressable>
  );
}

interface EstateManageProps {
  row: EstateRow;
  rpc: Rpc<SolanaRpcApi>;
  busy?: boolean;
  onReassign: (newHeir: Address) => void;
  onTiming: (fields: {
    heartbeatInterval?: bigint;
    gracePeriod?: bigint;
    pauseDuration?: bigint;
    label?: string;
  }) => void;
  onAddAsset: (mint: Address, amount: bigint) => void;
  onClose: () => void;
}

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
    <View style={{ padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
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
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13,
          lineHeight: 18,
          color: colors.mute,
        }}
      >
        {paused
          ? "This estate is paused. Wait until the pause ends."
          : "The check-in signer stays the same."}
      </Text>
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

function TimingForm({
  row,
  busy,
  onSubmit,
}: {
  row: EstateRow;
  busy?: boolean;
  onSubmit: EstateManageProps["onTiming"];
}) {
  const [label, setLabel] = useState(row.data.label);
  const [heartbeat, setHeartbeat] = useState(daysFromSeconds(row.data.heartbeatInterval));
  const [grace, setGrace] = useState(daysFromSeconds(row.data.gracePeriod));
  const [pause, setPause] = useState(daysFromSeconds(row.data.pauseDuration));
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <View style={{ padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Field
        label="Label"
        value={label}
        onChangeText={(value) => {
          setError(undefined);
          setLabel(value);
        }}
        editable={!busy}
        maxLength={LABEL_MAX_LEN}
      />
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
        hint={`How long a guardian can hold a claim. 0–${MAX_INTERVAL_DAYS}. Zero means they cannot hold.`}
      />
      <FormIssue text={error} />
      <PrimaryButton
        label={busy ? "Working…" : "Save timing"}
        tone="ink"
        disabled={busy}
        onPress={() => {
          try {
            onSubmit(collectTimingFields(row, label, heartbeat, grace, pause));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Check the form");
          }
        }}
      />
    </View>
  );
}

function AssetForm({
  rpc,
  estate,
  owner,
  busy,
  onSubmit,
}: {
  rpc: Rpc<SolanaRpcApi>;
  estate: Address;
  owner: Address;
  busy?: boolean;
  onSubmit: (mint: Address, amount: bigint) => void;
}) {
  const [mint, setMint] = useState("");
  const [amount, setAmount] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const locked = Boolean(busy) || checking;
  return (
    <View style={{ padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Field
        label="Mint"
        value={mint}
        onChangeText={(value) => {
          setError(undefined);
          setMint(value);
        }}
        editable={!locked}
        hint="A mint that is not already in this vault."
      />
      <Field
        label="Amount"
        value={amount}
        onChangeText={(value) => {
          setError(undefined);
          setAmount(value);
        }}
        keyboardType="decimal-pad"
        editable={!locked}
      />
      <FormIssue text={error} />
      <PrimaryButton
        label={busy || checking ? "Working…" : "Add token"}
        tone="ink"
        disabled={locked}
        onPress={() => {
          if (locked) return;
          void (async () => {
            setChecking(true);
            try {
              const mintAddr = parseAddress(mint, "mint");
              const meta = await fetchMintMeta(rpc, mintAddr);
              const raw = uiAmountToRaw(amount, meta.decimals);
              if (raw <= 0n) throw new Error("Enter an amount greater than zero");
              await assertMintUnregistered(rpc, estate, mintAddr);
              await assertWalletCanDeposit(
                rpc,
                owner,
                mintAddr,
                meta.tokenProgram,
                raw,
              );
              onSubmit(mintAddr, raw);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Check mint and amount");
            } finally {
              setChecking(false);
            }
          })();
        }}
      />
    </View>
  );
}

export function EstateManage({
  row,
  rpc,
  busy,
  onReassign,
  onTiming,
  onAddAsset,
  onClose,
}: EstateManageProps) {
  const [open, setOpen] = useState<EverydayAction | undefined>(undefined);
  const paused = isPausedNow(row.data.pausedUntil);

  function toggle(action: EverydayAction) {
    if (busy) return;
    setOpen((current) => (current === action ? undefined : action));
  }

  return (
    <View style={{ gap: 12 }}>
      <Cap>Manage</Cap>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: space.radiusTile,
          backgroundColor: colors.bg,
          overflow: "hidden",
        }}
      >
        <EverydayRow
          action="heir"
          selected={open === "heir"}
          disabled={busy}
          onPress={() => toggle("heir")}
        />
        {open === "heir" ? (
          <HeirForm busy={busy} paused={paused} onSubmit={onReassign} />
        ) : null}
        <EverydayRow
          action="timing"
          selected={open === "timing"}
          disabled={busy}
          onPress={() => toggle("timing")}
        />
        {open === "timing" ? (
          <TimingForm row={row} busy={busy} onSubmit={onTiming} />
        ) : null}
        <EverydayRow
          action="asset"
          last={open !== "asset"}
          selected={open === "asset"}
          disabled={busy}
          onPress={() => toggle("asset")}
        />
        {open === "asset" ? (
          <AssetForm
            rpc={rpc}
            estate={row.address}
            owner={row.data.authority}
            busy={busy}
            onSubmit={onAddAsset}
          />
        ) : null}
      </View>

      <View
        style={{
          borderWidth: 1.5,
          borderColor: colors.claim,
          borderRadius: space.radiusTile,
          backgroundColor: colors.bg,
          padding: 16,
          gap: 12,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            borderWidth: 1,
            borderColor: colors.claim,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: colors.bg,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: colors.claim,
            }}
          >
            Danger
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 18,
            letterSpacing: -0.3,
            color: colors.ink,
          }}
        >
          Close estate
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 14,
            lineHeight: 20,
            color: colors.mute,
          }}
        >
          Returns every locked asset to you and ends this vault. 0.5% is taken from the vault. The heir loses the claim.
        </Text>
        <Pressable
          onPress={onClose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Close estate"
          style={({ pressed }) => ({
            borderWidth: 1.5,
            borderColor: colors.claim,
            borderRadius: space.radiusBtn,
            paddingVertical: 14,
            alignItems: "center",
            opacity: busy ? 0.45 : 1,
            backgroundColor: pressed ? "rgba(255,59,59,0.08)" : colors.bg,
          })}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 13,
              letterSpacing: 1.04,
              textTransform: "uppercase",
              color: colors.claim,
            }}
          >
            {busy ? "Working…" : "Close estate"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
