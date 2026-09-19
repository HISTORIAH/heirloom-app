import { Text, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { colors } from "@/theme";

/** Champagne / brass — not brand yellow. */
const BRASS = "#C4A35A";
const BRASS_DEEP = "#7A6228";
const BRASS_LIGHT = "#E8D5A3";

function EmvChip({ size = 34 }: { size?: number }) {
  const w = size;
  const h = size * 0.78;
  const pad = size * 0.12;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <SvgGradient id="chipBevel" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={BRASS_LIGHT} />
          <Stop offset="45%" stopColor={BRASS} />
          <Stop offset="100%" stopColor={BRASS_DEEP} />
        </SvgGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} rx={4} fill="url(#chipBevel)" />
      <Rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        rx={3.5}
        fill="none"
        stroke={BRASS_LIGHT}
        strokeOpacity={0.7}
        strokeWidth={1}
      />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const cellW = (w - pad * 2 - pad * 0.9) / 3;
          const cellH = (h - pad * 2 - pad * 0.9) / 3;
          return (
            <Rect
              key={`${row}-${col}`}
              x={pad + col * (cellW + pad * 0.45)}
              y={pad + row * (cellH + pad * 0.45)}
              width={cellW}
              height={cellH}
              rx={1}
              fill={BRASS_DEEP}
              opacity={0.88}
            />
          );
        }),
      )}
    </Svg>
  );
}

function ContactlessMark({ size = 34 }: { size?: number }) {
  const stroke = "rgba(243,242,234,0.92)";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.8 7.6c2 1.9 2 5.1 0 7"
        stroke={stroke}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <Path
        d="M12.2 5.6c3 2.8 3 8.2 0 11"
        stroke={stroke}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <Path
        d="M14.6 3.8c3.9 3.6 3.9 11 0 14.6"
        stroke={stroke}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function VaultMarkMini({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="16 14 88 92" fill="none">
      <Rect x="16" y="14" width="21" height="92" rx="7" fill={colors.sage} />
      <Rect x="83" y="14" width="21" height="92" rx="7" fill={colors.sage} />
      <Path
        d="M37 60h9l7-17 14 34 7-17h9"
        fill="none"
        stroke={colors.sage}
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface NfcDummyCardProps {
  width?: number;
}

/**
 * Premium CR80 card for Scan — metal ink gradient, brass chip, Heirloom brand.
 * Bank-card silhouette; no Visa/Mastercard marks.
 */
export function NfcDummyCard({ width = 300 }: NfcDummyCardProps) {
  const height = width / 1.586;
  const radius = 16;

  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        shadowColor: colors.ink,
        shadowOpacity: 0.32,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      }}
    >
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        <Defs>
          {/* Metal face: cool catchlight → deep ink */}
          <SvgGradient id="cardFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6B7368" />
            <Stop offset="22%" stopColor="#2A302C" />
            <Stop offset="55%" stopColor="#121512" />
            <Stop offset="100%" stopColor={colors.ink} />
          </SvgGradient>
          {/* Thin diagonal specular band */}
          <SvgGradient id="specular" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="34%" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.26" />
            <Stop offset="41%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <Stop offset="46%" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} rx={radius} fill="url(#cardFace)" />
        <Rect x={0} y={0} width={width} height={height} rx={radius} fill="url(#specular)" />
        <Rect
          x={0.75}
          y={0.75}
          width={width - 1.5}
          height={height - 1.5}
          rx={radius - 0.5}
          fill="none"
          stroke="rgba(197,212,182,0.28)"
          strokeWidth={1}
        />
      </Svg>

      <View style={{ flex: 1, paddingHorizontal: 22, paddingVertical: 18 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <EmvChip />
          <ContactlessMark />
        </View>

        <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 4 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 22,
                  color: colors.soft,
                  letterSpacing: -0.5,
                }}
              >
                Heirloom
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 10,
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                  color: "rgba(197,212,182,0.75)",
                }}
              >
                NFC card
              </Text>
            </View>
            <VaultMarkMini />
          </View>
        </View>
      </View>
    </View>
  );
}
