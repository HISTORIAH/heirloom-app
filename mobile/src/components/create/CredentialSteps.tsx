import { Text, View } from "react-native";

import { OptionCard } from "@/components/create/OptionCard";
import { ErrorLine, StepHead } from "@/components/create/WizardChrome";
import { Icon } from "@/components/Icon";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { TapIllustration } from "@/components/TapIllustration";
import { Badge, Card, Display, Fine, Note, Steps, TextField, TickList } from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { CredentialMode, TapProgress } from "@/types/create";

export function CredentialModeStep({
  mode,
  onMode,
}: {
  mode: CredentialMode;
  onMode: (mode: CredentialMode) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <StepHead eyebrow="Credential · 1 of 3" title="How will they use it?" />
      <OptionCard
        on={mode === "claimOnce"}
        title="Tap to claim, once"
        body="They tap, the funds move, done. Nothing to remember."
        tag="Whoever holds it can claim"
        onPress={() => onMode("claimOnce")}
      />
      <OptionCard
        on={mode === "keepAsWallet"}
        title="Keep it as their wallet"
        body="After claiming, they keep using it to sign. Protected by a PIN."
        tag="You set a PIN · give it to them separately"
        onPress={() => onMode("keepAsWallet")}
      />
      <Note icon="shield">
        Before your check-in lapses, tapping it shows nothing about this estate — no amounts, no
        owner.
      </Note>
    </View>
  );
}

function ProgressRow({ label, state }: { label: string; state: "done" | "working" | "waiting" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            state === "done" ? colors.ink : state === "working" ? colors.yellow : "transparent",
          borderWidth: state === "done" ? 0 : space.rule,
          borderColor: state === "working" ? colors.ink : colors.quiet,
        }}
      >
        {state === "done" ? (
          <Icon name="check" size={15} color={colors.yellow} weight={3.5} />
        ) : null}
      </View>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 16,
          color: state === "waiting" ? colors.mute : colors.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function CredentialTapStep({ progress, error }: { progress: TapProgress; error?: string }) {
  const found = progress === "found" || progress === "done";
  const done = progress === "done";
  return (
    <View style={{ gap: 16 }}>
      <StepHead eyebrow="Credential · 2 of 3" title="Tap the card or ring you’ll give them" />
      <TapIllustration />
      <Card radius={18}>
        <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ gap: 14 }}>
          <ProgressRow
            label="Blank credential found"
            state={found ? "done" : progress === "failed" ? "waiting" : "working"}
          />
          <ProgressRow
            label="Creating its key on the chip…"
            state={done ? "done" : found ? "working" : "waiting"}
          />
          <ProgressRow label="Test signature" state={done ? "done" : "waiting"} />
        </View>
      </Card>
      <ErrorLine>{error}</ErrorLine>
      <Fine>
        Keep holding it. The key is made inside the chip and never leaves it — not even we can copy
        it.
      </Fine>
    </View>
  );
}

export function CredentialReadyStep({
  credential,
  name,
  onName,
}: {
  credential: string;
  name: string;
  onName: (next: string) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <StepHead eyebrow="Credential · 3 of 3" />
      <View style={{ alignItems: "center", gap: 10 }}>
        <NfcDummyCard width={300} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Badge label="Linked" fill={colors.yellow} />
          <Text
            style={{
              fontFamily: font.bold,
              fontSize: 13,
              fontVariant: ["tabular-nums"],
              color: colors.ink,
            }}
          >
            ····{credential.slice(-4)}
          </Text>
        </View>
      </View>
      <Display size={30}>Ready to hand over.</Display>
      <TickList
        items={[
          "Key created on the chip",
          "Test signature passed",
          "Tapping it on any phone opens the claim page",
        ]}
      />
      <TextField
        label="Who’s it for?"
        hint="stays on this phone"
        value={name}
        onChangeText={onName}
        placeholder="Their name"
      />
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.mute }}>
        Lost it while you’re around? Swap in a new one from the estate page.
      </Text>
    </View>
  );
}

export function HandoverStep({ firstDue }: { firstDue: string }) {
  return (
    <View style={{ gap: 14 }}>
      <Display size={34}>Now hand it over.</Display>
      <Steps
        items={[
          {
            title: "Give it to them",
            body: "In person is best. It already holds 0.02 SOL for its own fees.",
          },
          {
            title: "Tell them one thing",
            body: "“If something happens to me, tap this on your phone.”",
          },
          {
            title: "That’s it",
            body: "Until your check-in lapses, it shows them nothing about this estate.",
          },
        ]}
      />
      <Note icon="clock" tone="yellow">{`First check-in due ${firstDue}. We’ll remind you.`}</Note>
    </View>
  );
}
