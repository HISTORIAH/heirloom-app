import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

/** Stroke icons from the mobile redesign. 24-unit grid, round caps and joins. */
const glyphs = {
  tap: (
    <>
      <Path d="M7 8.5a5 5 0 0 1 0 7" />
      <Path d="M11 6a9 9 0 0 1 0 12" />
      <Path d="M15 3.5a13 13 0 0 1 0 17" />
    </>
  ),
  estate: (
    <>
      <Path d="M3 11.5L12 4l9 7.5" />
      <Path d="M5.5 9.5V20h13V9.5" />
      <Circle cx="12" cy="13" r="1.8" />
      <Path d="M12 14.8V17" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <Path d="M10 21h4" />
    </>
  ),
  check: <Path d="M5 12.5l4.5 4.5L19 7" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  chevronLeft: <Path d="M15 6l-6 6 6 6" />,
  chevronDown: <Path d="M7 10l5 5 5-5" />,
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  unlock: (
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </>
  ),
  telegram: (
    <>
      <Path d="M21 4L3 11l6 2 2 6 3-4 5 4z" />
      <Path d="M9 13l8-6" />
    </>
  ),
  mail: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  phone: (
    <>
      <Rect x="7" y="2" width="10" height="20" rx="2" />
      <Path d="M11 18h2" />
    </>
  ),
  send: (
    <>
      <Path d="M21 3L3 11l7 3 3 7z" />
      <Path d="M10 14l11-11" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  shield: <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  qr: (
    <>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
      <Path d="M14 14h3v3M21 14v7h-4M17 21v0" />
    </>
  ),
  paste: (
    <>
      <Rect x="8" y="3" width="8" height="4" rx="1" />
      <Path d="M8 5H6v16h12V5h-2" />
    </>
  ),
  copy: (
    <>
      <Rect x="9" y="9" width="11" height="11" rx="2" />
      <Path d="M5 15V5a1 1 0 0 1 1-1h9" />
    </>
  ),
  external: (
    <>
      <Path d="M14 4h6v6" />
      <Path d="M20 4l-9 9" />
      <Path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  flash: <Path d="M9 2h6l-1 7h4l-8 13 2-9H7z" />,
} as const;

export type IconName = keyof typeof glyphs;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: number;
};

export function Icon({ name, size = 20, color = colors.ink, weight = 2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyphs[name]}
    </Svg>
  );
}
