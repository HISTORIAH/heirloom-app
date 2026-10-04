import { Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { colors, font, space } from "@/theme";

/**
 * Phone, a credential card leaning on it, a ring, and the tap waves: "hold
 * it to the back of your phone". Decorative.
 */
export function TapIllustration() {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ height: 150, alignItems: "center", justifyContent: "center" }}
    >
      <View style={{ width: 240, height: 150 }}>
        <View style={{ position: "absolute", left: 4, top: 50 }}>
          <Icon name="tap" size={40} weight={2.2} />
        </View>
        <View
          style={{
            position: "absolute",
            left: 54,
            top: 0,
            width: 96,
            height: 150,
            borderRadius: 20,
            borderWidth: 3,
            borderColor: colors.ink,
            backgroundColor: colors.paper,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 94,
            top: 46,
            width: 136,
            height: 84,
            borderRadius: space.radiusBtn,
            borderWidth: space.rule,
            borderColor: colors.ink,
            backgroundColor: colors.cardFace,
            padding: 10,
            justifyContent: "space-between",
            transform: [{ rotate: "-8deg" }],
          }}
        >
          <View style={{ width: 22, height: 16, borderRadius: 3, backgroundColor: colors.brass }} />
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.bg }}>Heirloom</Text>
        </View>
        <View
          style={{
            position: "absolute",
            left: 192,
            top: 6,
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: space.rule,
            borderColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              borderWidth: 7,
              borderColor: colors.brass,
            }}
          />
        </View>
      </View>
    </View>
  );
}
