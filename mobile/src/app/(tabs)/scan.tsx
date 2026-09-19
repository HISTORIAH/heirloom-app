import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
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
import { Cap, H2, Lede, PrimaryButton, Row, TextLink, Tile } from "@/components/ui";
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
    refreshCapability,
    startScan,
    stopScan,
    openSettings,
  } = useNfcScan();

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 130,
          alignItems: "center",
        }}
      >
        <Cap>Scan</Cap>
        <H2>{listening ? "Keep it still" : copy.title}</H2>
        <Lede>{listening ? "Reading the card…" : copy.body}</Lede>

        <Animated.View style={[{ marginTop: 28 }, cardStyle]}>
          <NfcDummyCard width={300} />
        </Animated.View>

        <View style={{ marginTop: 28, width: "100%", gap: 10 }}>
          {capability.status === "disabled" ? (
            <>
              <PrimaryButton
                label="Open NFC settings"
                tone="sage"
                onPress={() => {
                  void openSettings();
                }}
              />
              <TextLink label="Check again" onPress={() => void refreshCapability()} />
            </>
          ) : null}

          {ready && !listening ? (
            <PrimaryButton
              label={phase === "done" ? "Scan again" : "Ready to scan"}
              tone="sage"
              onPress={() => void startScan()}
            />
          ) : null}

          {listening ? (
            <PrimaryButton label="Cancel" tone="ink" onPress={() => void stopScan()} />
          ) : null}
        </View>

        {error ? (
          <View style={{ marginTop: 20, width: "100%" }}>
            <Tile claim>
              <Cap>Could not read</Cap>
              <Text
                style={{
                  marginTop: 8,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 14,
                  color: colors.ink,
                }}
              >
                {error}
              </Text>
            </Tile>
          </View>
        ) : null}

        {tag ? (
          <View style={{ marginTop: 20, width: "100%" }}>
            <Tile paper>
              <Cap>Tag</Cap>
              {tag.idHex ? <Row left="ID" right={tag.idHex} /> : null}
              {tag.techs.length > 0 ? (
                <Row left="Tech" right={tag.techs.map(shortTech).join(", ")} />
              ) : null}
              {tag.ndefType ? <Row left="Type" right={tag.ndefType} /> : null}
              {tag.ndefRecordCount !== undefined ? (
                <Row left="NDEF records" right={String(tag.ndefRecordCount)} />
              ) : null}
              {tag.maxSize !== undefined ? (
                <Row left="Max size" right={`${tag.maxSize} B`} />
              ) : null}
            </Tile>
            <Text
              style={{
                marginTop: 10,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 12,
                color: colors.mute,
                textAlign: "center",
              }}
            >
              Temporary reader — Java Card signing comes later.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function shortTech(tech: string): string {
  const parts = tech.split(".");
  return parts[parts.length - 1] ?? tech;
}
