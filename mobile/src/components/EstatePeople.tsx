import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Cap } from "@/components/ui";
import { shortAddress } from "@/lib/address";
import { colors, space } from "@/theme";

interface EstatePeopleProps {
  heir: string;
  heartbeat?: string;
  guardian?: string;
}

function GiftMark({ color = colors.ink }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12v10H4V12"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <Path d="M2 7h20v5H2z" stroke={color} strokeWidth="1.75" />
      <Path d="M12 22V7" stroke={color} strokeWidth="1.75" />
      <Path
        d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"
        stroke={color}
        strokeWidth="1.75"
      />
      <Path
        d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
        stroke={color}
        strokeWidth="1.75"
      />
    </Svg>
  );
}

function BeatMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h4l2.5-5 4 10 2.5-5H21"
        stroke={colors.ink}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2l6 2.2v5.1c0 3.7-2.4 6.9-6 8.2-3.6-1.3-6-4.5-6-8.2V5.4L12 3.2z"
        stroke={colors.ink}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SecondarySlot({
  title,
  blurb,
  address,
  markBg,
  icon,
}: {
  title: string;
  blurb: string;
  address?: string;
  markBg: string;
  icon: "beat" | "shield";
}) {
  const named = address !== undefined;
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: space.radiusTile,
        backgroundColor: colors.soft,
        padding: 12,
        gap: 8,
        minHeight: 128,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: markBg,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon === "beat" ? <BeatMark /> : <ShieldMark />}
      </View>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.ink,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 12,
          lineHeight: 16,
          color: colors.mute,
          flexGrow: 1,
        }}
      >
        {blurb}
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: named ? colors.ink : colors.mute,
        }}
      >
        {named ? shortAddress(address) : "Not set"}
      </Text>
    </View>
  );
}

/** Heir stamped large; heartbeat + guardian as quieter secondary slots. */
export function EstatePeople({ heir, heartbeat, guardian }: EstatePeopleProps) {
  const namedCount =
    1 + (heartbeat !== undefined ? 1 : 0) + (guardian !== undefined ? 1 : 0);

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingHorizontal: 2,
        }}
      >
        <Cap>People</Cap>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 11,
            letterSpacing: 1.4,
            color: colors.mute,
          }}
        >
          {String(namedCount).padStart(2, "0")} / 03 named
        </Text>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: space.radiusTile,
          backgroundColor: colors.bg,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: colors.yellow,
              borderWidth: 1,
              borderColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GiftMark />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 11,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: colors.mute,
              }}
            >
              Heir
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 20,
                letterSpacing: -0.4,
                color: colors.ink,
              }}
            >
              {shortAddress(heir)}
            </Text>
          </View>
          <View
            style={{
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.ink,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: colors.soft,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 9,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: colors.ink,
              }}
            >
              Named
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 14,
            lineHeight: 20,
            color: colors.mute,
          }}
        >
          Receives the vault when the claim window opens.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <SecondarySlot
          title="Heartbeat"
          blurb="Checks in so the timer keeps running"
          address={heartbeat}
          markBg={colors.sage}
          icon="beat"
        />
        <SecondarySlot
          title="Guardian"
          blurb="Can defer a claim while live"
          address={guardian}
          markBg={colors.line}
          icon="shield"
        />
      </View>
    </View>
  );
}
