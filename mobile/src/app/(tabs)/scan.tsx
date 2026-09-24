import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AppHeader } from "@/components/AppHeader";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { QuietRow, SectionLabel } from "@/components/Quiet";
import { StateSlab } from "@/components/StateSlab";
import { PrimaryButton } from "@/components/ui";
import { useNfcScan } from "@/hooks/useNfcScan";
import { colors } from "@/theme";

function statusCopy(capability: ReturnType<typeof useNfcScan>["capability"]): {
  title: string;
  body: string;
} {
  if (capability.status === "checking") {
    return { title: "Checking NFC…", body: "One moment." };
  }
  if (capability.status === "unsupported") {
    return {
      title: "NFC not available",
      body: "This phone cannot read NFC cards.",
    };
  }
  if (capability.status === "disabled") {
    return {
      title: "Turn on NFC",
      body: "NFC is off. Enable it in Settings, then come back.",
    };
  }
  return {
    title: "Hold to the phone",
    body: "Put the card against the back of your phone.",
  };
}

export default function ScanScreen() {
  const {
    capability,
    phase,
    tag,
    error,
    startScan,
    stopScan,
    reset,
    openSettings,
  } = useNfcScan();

  useFocusEffect(
    useCallback(() => {
      return () => {
        reset();
      };
    }, [reset]),
  );

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (phase !== "listening") {
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [phase, pulse]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const copy = statusCopy(capability);
  const ready = capability.status === "ready";
  const listening = phase === "listening";
  const slab = slabColor(listening, ready);

  const canListen = ready || listening;
  const headline = canListen
    ? "Hold the card to the back of the phone"
    : copy.title;

  function onCard() {
    if (listening) {
      void stopScan();
      return;
    }
    if (ready) void startScan();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130, flexGrow: 1 }}>
        <StateSlab
          color={slab}
          underStatusBar
          headline={headline}
          advice={listening ? "Keep it still." : ready ? undefined : copy.body}
          leading={<AppHeader plain />}
        >
          <Pressable
            onPress={onCard}
            disabled={!canListen}
            accessibilityRole="button"
            accessibilityLabel={headline}
            style={{ marginTop: 22, alignItems: "center" }}
          >
            <Animated.View style={cardStyle}>
              <NfcDummyCard width={300} />
            </Animated.View>
          </Pressable>
          {capability.status === "disabled" ? (
            <View style={{ marginTop: 22 }}>
              <PrimaryButton
                label="Open NFC settings"
                tone="ink"
                onPress={() => void openSettings()}
              />
            </View>
          ) : null}
        </StateSlab>

        {error !== undefined && error.length > 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 15,
                color: colors.claim,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {tag ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
            <SectionLabel title="Last tag" />
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
              {tag.idHex ? <QuietRow title="ID" desc={tag.idHex} /> : null}
              {tag.techs.length > 0 ? (
                <QuietRow title="Tech" desc={tag.techs.map(shortTech).join(", ")} />
              ) : null}
              {tag.ndefType ? <QuietRow title="Type" desc={tag.ndefType} /> : null}
              {tag.ndefRecordCount !== undefined ? (
                <QuietRow title="NDEF records" desc={String(tag.ndefRecordCount)} />
              ) : null}
              {tag.maxSize !== undefined ? (
                <QuietRow title="Max size" desc={`${tag.maxSize} B`} />
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function slabColor(listening: boolean, ready: boolean): string {
  if (listening) return colors.yellow;
  if (ready) return colors.sage;
  return colors.soft;
}

function shortTech(tech: string): string {
  const parts = tech.split(".");
  return parts[parts.length - 1] ?? tech;
}
