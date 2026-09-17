import Svg, { Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

interface VaultMarkProps {
  size?: number;
  color?: string;
}

export function VaultMark({ size = 88, color = colors.line }: VaultMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="16 14 88 92" fill="none">
      <Rect x="16" y="14" width="21" height="92" rx="7" fill={color} />
      <Rect x="83" y="14" width="21" height="92" rx="7" fill={color} />
      <Path
        d="M37 60h9l7-17 14 34 7-17h9"
        fill="none"
        stroke={color}
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
