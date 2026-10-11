import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/Icon";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { COPIED_MS } from "@/constants/ui";
import { colors, font, floatShadow, space } from "@/theme";
import type { ConfirmAsk, FailureKind } from "@/types/ui";

const FAILURE_ICON: Record<FailureKind, IconName> = {
  cancelled: "close",
  walletUnreachable: "walletOff",
  noWallet: "walletOff",
  network: "signalOff",
  insufficientSol: "alert",
  expired: "clock",
  program: "alert",
  card: "tap",
  known: "alert",
  unknown: "alert",
};

/** The raw error, collapsed until asked for, with Copy. */
function TechnicalDetails({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <View
      style={{
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: space.radiusBtn,
        backgroundColor: colors.paper,
      }}
    >
      <Pressable
        onPress={() => setOpen((was) => !was)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: colors.mute }}>Technical details</Text>
        <Icon name={open ? "chevronDown" : "chevronRight"} size={16} color={colors.mute} />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
          <Text selectable style={{ fontFamily: font.mono, fontSize: 12, lineHeight: 18, color: colors.ink }}>
            {text}
          </Text>
          <Pressable
            onPress={() => {
              void Clipboard.setStringAsync(text);
              setCopied(true);
              setTimeout(() => setCopied(false), COPIED_MS);
            }}
            accessibilityRole="button"
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: colors.ink,
              borderRadius: space.radiusSmall,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.ink }}>
              {copied ? "Copied" : "Copy"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** A cancel: a dark pill above the nav, with Retry when there's something to retry. */
function FailureToast({ ask, onRetry }: { ask: ConfirmAsk; onRetry: () => void }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 124,
        zIndex: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.ink,
        borderRadius: space.radiusTile,
        paddingVertical: 12,
        paddingHorizontal: 16,
        ...floatShadow,
      }}
    >
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.white }}>
        {ask.title}
      </Text>
      {ask.confirmLabel.length > 0 ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.yellow }}>{ask.confirmLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Failure sheet head: the round icon badge, then title and body. */
function FailureHead({ ask }: { ask: ConfirmAsk }) {
  return (
    <>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <Icon name={FAILURE_ICON[ask.failureKind ?? "unknown"]} size={24} />
      </View>
      <H2 size={24}>{ask.title}</H2>
      {ask.body !== undefined && ask.body.length > 0 ? <Lede size={15}>{ask.body}</Lede> : null}
      {ask.details ? <TechnicalDetails text={ask.details} /> : null}
    </>
  );
}

function soloKind(kind?: ConfirmAsk["kind"]): boolean {
  return kind === "notice" || kind === "fail";
}

function SheetActions({
  ask,
  onCancel,
  onConfirm,
  onExtra,
}: {
  ask: ConfirmAsk;
  onCancel: () => void;
  onConfirm: () => void;
  onExtra: () => void;
}) {
  if (ask.kind === "fail" && ask.cancelLabel !== undefined) {
    return (
      <View style={{ marginTop: 20 }}>
        <PrimaryButton label={ask.confirmLabel} tone="yellow" onPress={onConfirm} />
        <TextLink label={ask.cancelLabel} onPress={onCancel} />
      </View>
    );
  }

  if (soloKind(ask.kind)) {
    return (
      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          label={ask.confirmLabel}
          tone={ask.confirmTone ?? "yellow"}
          onPress={onConfirm}
        />
        {ask.extraLabel !== undefined ? (
          <TextLink label={ask.extraLabel} onPress={onExtra} />
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        marginTop: 20,
      }}
    >
      <View style={{ flex: 1 }}>
        <PrimaryButton label={ask.cancelLabel ?? "Not now"} tone="paper" onPress={onCancel} />
      </View>
      <View style={{ flex: 1 }}>
        <PrimaryButton
          label={ask.confirmLabel}
          tone={ask.confirmTone ?? "ink"}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}

export function ConfirmSheet({
  ask,
  onCancel,
  onConfirm,
  onExtra,
}: {
  ask?: ConfirmAsk;
  onCancel: () => void;
  onConfirm: () => void;
  onExtra: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (ask?.kind === "toast") return <FailureToast ask={ask} onRetry={onConfirm} />;
  return (
    <Modal visible={ask !== undefined} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(10,10,10,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.soft,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: colors.ink,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 3,
              backgroundColor: colors.quiet,
              alignSelf: "center",
              marginBottom: 18,
            }}
          />
          {ask ? (
            <>
              {ask.kind === "fail" ? (
                <FailureHead ask={ask} />
              ) : (
                <>
                  <Cap>{ask.cap}</Cap>
                  <H2 size={22}>{ask.title}</H2>
                  {ask.body !== undefined ? <Lede>{ask.body}</Lede> : null}
                </>
              )}
              <SheetActions ask={ask} onCancel={onCancel} onConfirm={onConfirm} onExtra={onExtra} />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
