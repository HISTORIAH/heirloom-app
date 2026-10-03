import { useState } from "react";
import { Image, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { colors, font, space } from "@/theme";

/** Token icon with selection state. Falls back to symbol text when the image fails. */
export function TokenAvatar({
  image,
  symbol,
  kind,
  checked,
  size = 44,
}: {
  image?: string;
  symbol: string;
  kind: string;
  checked: boolean;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: checked ? colors.yellow : colors.paper,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <AvatarImage image={image} symbol={symbol} kind={kind} size={size} />
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
}: {
  image?: string;
  symbol: string;
  kind: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <Text style={{ fontFamily: font.bold, fontSize: 10, color: colors.ink }}>
        {symbol.slice(0, 4)}
      </Text>
    );
  }
  return (
    <Image
      source={{ uri: image }}
      style={{ width: size - 6, height: size - 6, borderRadius: space.radiusBtn - 3 }}
      onError={() => setFailed(true)}
    />
  );
}
