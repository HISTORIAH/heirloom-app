import { useState } from "react";
import { Image, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { colors, font, space } from "@/theme";

/** Token icon with selection state. Falls back to symbol text when the image fails. */
export function TokenAvatar({
  image,
  symbol,
  kind,
  checked = false,
  size = 44,
  round,
  fill = colors.paper,
}: {
  image?: string;
  symbol: string;
  kind: string;
  checked?: boolean;
  size?: number;
  /** Circle instead of the rounded square: estate holdings and the top-up sheet. */
  round?: boolean;
  /** Face colour behind the symbol fallback. */
  fill?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: round ? size / 2 : space.radiusBtn,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: checked ? colors.yellow : fill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <AvatarImage image={image} symbol={symbol} kind={kind} size={size} round={round} />
      {checked ? (
        <View
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={10} color={colors.paper} weight={3.5} />
        </View>
      ) : null}
    </View>
  );
}

/** Loads the token image; on error falls back to the symbol text. */
function AvatarImage({
  image,
  symbol,
  kind,
  size,
  round,
}: {
  image?: string;
  symbol: string;
  kind: string;
  size: number;
  round?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <Text style={{ fontFamily: font.bold, fontSize: size < 36 ? 8 : size < 44 ? 9 : 10, color: colors.ink }}>
        {symbol.slice(0, 4)}
      </Text>
    );
  }
  return (
    <Image
      source={{ uri: image }}
      style={{
        width: size - 6,
        height: size - 6,
        borderRadius: round ? (size - 6) / 2 : space.radiusBtn - 3,
      }}
      onError={() => setFailed(true)}
    />
  );
}
