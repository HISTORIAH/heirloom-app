import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addressFromText } from "@/components/create/AddressField";
import { Icon } from "@/components/Icon";
import { IconButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { parseAddress } from "@/lib";

const FRAME = 260;
const CORNER = 40;

function Corner({ top, left }: { top: boolean; left: boolean }) {
  return (
    <View
      style={{
        position: "absolute",
        width: CORNER,
        height: CORNER,
        top: top ? 0 : undefined,
        bottom: top ? undefined : 0,
        left: left ? 0 : undefined,
        right: left ? undefined : 0,
        borderColor: colors.yellow,
        borderTopWidth: top ? 5 : 0,
        borderBottomWidth: top ? 0 : 5,
        borderLeftWidth: left ? 5 : 0,
        borderRightWidth: left ? 0 : 5,
        borderTopLeftRadius: top && left ? 14 : 0,
        borderTopRightRadius: top && !left ? 14 : 0,
        borderBottomLeftRadius: !top && left ? 14 : 0,
        borderBottomRightRadius: !top && !left ? 14 : 0,
      }}
    />
  );
}

function LightButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: "paste";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 52,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: colors.bg,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {icon !== undefined ? <Icon name={icon} size={18} color={colors.bg} /> : null}
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.bg }}>{label}</Text>
    </Pressable>
  );
}

/** QR scanner for an address. Accepts bare addresses and `solana:` URIs. */
export function ScanAddress({
  onBack,
  onPaste,
  onAddress,
}: {
  onBack: () => void;
  onPaste: () => void;
  onAddress: (address: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [miss, setMiss] = useState(false);
  const done = useRef(false);

  function onScanned(result: BarcodeScanningResult) {
    if (done.current) return;
    try {
      const value = parseAddress(addressFromText(result.data), "address");
      done.current = true;
      onAddress(value);
    } catch {
      setMiss(true);
    }
  }

  const granted = permission?.granted === true;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      {granted ? (
        <CameraView
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={onScanned}
        />
      ) : null}

      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: space.pad,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <IconButton tone="dark" icon="close" label="Back" onPress={onBack} />
        <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.bg }}>
          Scan their address
        </Text>
        <IconButton
          tone="dark"
          icon="flash"
          label={torch ? "Turn off flashlight" : "Turn on flashlight"}
          onPress={() => setTorch((on) => !on)}
        />
      </View>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          paddingHorizontal: 32,
        }}
      >
        <View style={{ width: FRAME, height: FRAME }}>
          <Corner top left />
          <Corner top left={false} />
          <Corner top={false} left />
          <Corner top={false} left={false} />
        </View>
        <Text
          accessibilityLiveRegion="polite"
          style={{
            maxWidth: 280,
            textAlign: "center",
            fontFamily: font.regular,
            fontSize: 16,
            lineHeight: 23,
            color: colors.bg,
          }}
        >
          {!granted
            ? "Heirloom needs the camera to read their QR."
            : miss
              ? "That QR isn’t a Solana address. Try their wallet’s Receive screen."
              : "Ask them to open their wallet’s Receive screen and point at the QR."}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
          gap: 10,
        }}
      >
        {!granted && permission?.canAskAgain !== false ? (
          <LightButton label="Allow camera" onPress={() => void requestPermission()} />
        ) : null}
        <LightButton icon="paste" label="Paste address instead" onPress={onPaste} />
      </View>
    </View>
  );
}
