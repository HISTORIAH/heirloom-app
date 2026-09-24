import { useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { colors } from "@/theme";

export type ConfirmAsk = {
  cap: string;
  title: string;
  body?: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmTone?: "yellow" | "ink" | "sage";
  extraLabel?: string;
  kind?: "confirm" | "notice" | "fail";
};

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
        <PrimaryButton
          label={ask.cancelLabel ?? "Not now"}
          tone="sage"
          onPress={onCancel}
        />
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
  return (
    <Modal
      visible={ask !== undefined}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(10,10,10,0.28)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.soft,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              alignSelf: "center",
              marginBottom: 18,
            }}
          />
          {ask ? (
            <>
              <Cap color={ask.kind === "fail" ? colors.claim : colors.mute}>
                {ask.cap}
              </Cap>
              <H2 size={22}>{ask.title}</H2>
              {ask.body !== undefined ? <Lede>{ask.body}</Lede> : null}
              <SheetActions
                ask={ask}
                onCancel={onCancel}
                onConfirm={onConfirm}
                onExtra={onExtra}
              />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useConfirmSheet() {
  const pending = useRef<(() => void) | undefined>(undefined);
  const extraRun = useRef<(() => void) | undefined>(undefined);
  const [ask, setAsk] = useState<ConfirmAsk | undefined>(undefined);

  function close() {
    pending.current = undefined;
    extraRun.current = undefined;
    setAsk(undefined);
  }

  function prompt(next: ConfirmAsk, run: () => void) {
    pending.current = run;
    extraRun.current = undefined;
    setAsk({ ...next, kind: "confirm" });
  }

  function notice(
    next: {
      cap: string;
      title: string;
      body?: string;
      doneLabel?: string;
      extraLabel?: string;
    },
    extra?: () => void,
  ) {
    pending.current = undefined;
    extraRun.current = extra;
    setAsk({
      cap: next.cap,
      title: next.title,
      body: next.body,
      confirmLabel: next.doneLabel ?? "OK",
      confirmTone: "yellow",
      extraLabel: next.extraLabel,
      kind: "notice",
    });
  }

  function fail(cap: string, cause: unknown) {
    pending.current = undefined;
    extraRun.current = undefined;
    setAsk({
      cap,
      title: cause instanceof Error ? cause.message : "Something went wrong",
      confirmLabel: "OK",
      confirmTone: "yellow",
      kind: "fail",
    });
  }

  function cancel() {
    close();
  }

  function confirm() {
    const run = pending.current;
    close();
    run?.();
  }

  function extra() {
    const run = extraRun.current;
    close();
    run?.();
  }

  return { ask, prompt, notice, fail, cancel, confirm, extra };
}
