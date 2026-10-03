import type { ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { colors, font, space } from "@/theme";

// ----------------------------------------------------------------- buttons

/**
 * yellow  — the one primary action on a screen (56, uppercase).
 * ink     — the action inside a coloured hero (52, uppercase).
 * paper   — secondary (52, sentence case). `outline` and `sage` are aliases.
 * danger  — destructive secondary.
 */
type BtnTone = "yellow" | "ink" | "paper" | "outline" | "sage" | "danger";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  tone?: BtnTone;
  disabled?: boolean;
  /** Small inline button: Add, Edit, Create. */
  compact?: boolean;
  /** Kept for older call sites; every button is ruled now. */
  inkBorder?: boolean;
  icon?: IconName;
};

export function PrimaryButton({
  label,
  onPress,
  tone = "yellow",
  disabled,
  compact,
  icon,
}: PrimaryButtonProps) {
  const t = tone === "outline" || tone === "sage" ? "paper" : tone;

  if (compact) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => ({
          minHeight: 40,
          minWidth: 56,
          paddingHorizontal: 12,
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: space.radiusSmall,
          borderWidth: space.rule,
          borderColor: t === "danger" ? colors.claim : colors.ink,
          backgroundColor: t === "ink" ? colors.ink : t === "yellow" ? colors.yellow : colors.paper,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        })}
      >
        {icon !== undefined ? (
          <Icon name={icon} size={16} weight={2.5} color={t === "ink" ? colors.bg : colors.ink} />
        ) : null}
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 13,
            color: t === "ink" ? colors.bg : t === "danger" ? colors.claim : colors.ink,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  // A disabled primary reads as "not yet": dashed and empty, as in the mockups.
  const ghost = disabled && t === "yellow";
  const loud = t === "yellow" || t === "ink";
  const fg = ghost
    ? colors.mute
    : t === "ink"
      ? colors.bg
      : t === "danger"
        ? colors.claim
        : colors.ink;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        width: "100%",
        height: t === "yellow" ? 56 : 52,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: space.radiusBtn,
        borderWidth: t === "ink" ? 0 : space.rule,
        borderStyle: ghost ? "dashed" : "solid",
        borderColor: ghost ? colors.disabledRule : t === "danger" ? colors.claim : colors.ink,
        backgroundColor: ghost
          ? "transparent"
          : t === "yellow"
            ? colors.yellow
            : t === "ink"
              ? colors.ink
              : t === "danger"
                ? "transparent"
                : colors.paper,
        opacity: disabled && !ghost ? 0.45 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
      })}
    >
      {icon !== undefined ? <Icon name={icon} size={20} color={fg} weight={2.5} /> : null}
      <Text
        style={{
          color: fg,
          fontFamily: font.bold,
          fontSize: t === "yellow" ? 16 : 15,
          letterSpacing: loud ? (t === "ink" ? 0.9 : 0.64) : 0,
          textTransform: loud ? "uppercase" : "none",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Dashed "add another" affordance. */
export function GhostAdd({ label, onPress }: { label: string; onPress: () => void }) {
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
        borderStyle: "dashed",
        borderColor: colors.ink,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name="plus" size={18} weight={2.5} />
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

type TextLinkProps = {
  label: string;
  onPress?: () => void;
  align?: "center" | "left";
  quiet?: boolean;
  flush?: boolean;
};

export function TextLink({ label, onPress, align = "center", quiet, flush }: TextLinkProps) {
  const color = quiet ? colors.mute : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={{ marginTop: flush ? 0 : 8, paddingVertical: 10 }}
    >
      <Text
        style={{
          textAlign: align,
          fontFamily: font.regular,
          fontSize: quiet ? 13 : 14,
          color,
          textDecorationLine: "underline",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Round icon-only control: close, back, flashlight, new. */
export function IconButton({
  icon,
  label,
  onPress,
  tone = "paper",
  size = 44,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "paper" | "dark";
  size?: number;
}) {
  const dark = tone === "dark";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size < 44 ? 6 : 0}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: space.rule,
        borderColor: dark ? colors.bg : colors.ink,
        backgroundColor: dark ? "transparent" : colors.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon
        name={icon}
        size={size < 44 ? 16 : 20}
        weight={size < 44 ? 2.5 : 2}
        color={dark ? colors.bg : colors.ink}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------- type

type CapProps = {
  /** Sentence case. This control uppercases and tracks. */
  children: string;
  color?: string;
};

export function Cap({ children, color = colors.mute }: CapProps) {
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: 11,
        letterSpacing: 1.98,
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </Text>
  );
}

/** The one headline a screen opens with. */
export function Display({ children, size = 32 }: { children: ReactNode; size?: number }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: font.semibold,
        fontSize: size,
        lineHeight: Math.round(size * 1.06),
        letterSpacing: size * -0.035,
        color: colors.ink,
      }}
    >
      {children}
    </Text>
  );
}

type H2Props = {
  children: string;
  size?: number;
};

export function H2({ children, size = 34 }: H2Props) {
  return (
    <Text
      style={{
        fontFamily: font.semibold,
        fontSize: size,
        letterSpacing: size * -0.035,
        lineHeight: size * 1.12,
        color: colors.ink,
        marginVertical: 8,
      }}
    >
      {children}
    </Text>
  );
}

export function Lede({ children, size = 16 }: { children: string; size?: number }) {
  return (
    <Text
      style={{
        fontFamily: font.regular,
        fontSize: size,
        lineHeight: size * 1.45,
        color: colors.mute,
      }}
    >
      {children}
    </Text>
  );
}

/** Small print under a control. */
export function Fine({
  children,
  center,
  ink,
}: {
  children: ReactNode;
  center?: boolean;
  ink?: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: font.regular,
        fontSize: 14,
        lineHeight: 20,
        color: ink ? colors.ink : colors.mute,
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </Text>
  );
}

// ------------------------------------------------------------- surfaces

/** White ruled surface: option cards, lists, checklists. */
export function Card({
  children,
  radius = space.radiusTile,
  padding = space.tile,
  fill = colors.paper,
  style,
}: {
  children: ReactNode;
  radius?: number;
  padding?: number;
  fill?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          borderWidth: space.rule,
          borderColor: colors.ink,
          borderRadius: radius,
          padding,
          backgroundColor: fill,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Dashed placeholder: "Roles on this wallet", "No estate of your own yet". */
export function Dashed({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          borderWidth: space.rule,
          borderStyle: "dashed",
          borderColor: colors.quiet,
          borderRadius: space.radiusTile,
          padding: space.tile,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Ruled fact row: muted label left, bold value right. */
export function FactRow({
  label,
  value,
  aside,
  first,
  strong,
}: {
  label: string;
  value: string;
  aside?: ReactNode;
  /** Drop the top rule (first row inside a card). */
  first?: boolean;
  /** Label as bold as the value (asset rows). */
  strong?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : space.rule,
        borderTopColor: colors.line,
      }}
    >
      <Text
        style={{
          fontFamily: strong ? font.bold : font.regular,
          fontSize: strong ? 16 : 14,
          color: strong ? colors.ink : colors.mute,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: font.bold,
            fontSize: strong ? 16 : 15,
            fontVariant: ["tabular-nums"],
            color: colors.ink,
            flexShrink: 1,
          }}
        >
          {value}
        </Text>
        {aside}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- tags

/** Small tracked status tag: DEVNET, ACTIVE, IN GRACE. */
export function Badge({ label, fill = colors.paper }: { label: string; fill?: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: fill,
      }}
    >
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontVariant: ["tabular-nums"],
          color: colors.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Rounded status pill: "GRACE 5d", "OWNER · 2", "CLAIMABLE NOW". */
export function Pill({
  label,
  fill = colors.paper,
  dot,
}: {
  label: string;
  fill?: string;
  dot?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: dot ? 12 : 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: fill,
      }}
    >
      {dot ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink }} />
      ) : null}
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: dot ? 13 : 12,
          letterSpacing: dot ? 0.5 : 0,
          textTransform: "uppercase",
          fontVariant: ["tabular-nums"],
          color: colors.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// -------------------------------------------------------------- controls

/** Ruled square check. `large` is the 44pt asset-row control. */
export function CheckBox({ checked, large }: { checked: boolean; large?: boolean }) {
  const size = large ? 44 : 24;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: large ? space.radiusBtn : 6,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: checked ? (large ? colors.yellow : colors.ink) : colors.paper,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked ? (
        <Icon
          name="check"
          size={large ? 18 : 16}
          color={large ? colors.ink : colors.paper}
          weight={3}
        />
      ) : null}
    </View>
  );
}

export function RadioDot({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: space.rule,
        borderColor: colors.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on ? (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink }} />
      ) : null}
    </View>
  );
}

/** Square segmented choice (check-in interval, heir wait). Sits in an equal-width row. */
export function Chip({
  label,
  on,
  onPress,
  role = "radio",
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  role?: "button" | "radio" | "tab";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: on, selected: on }}
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        borderRadius: space.radiusBtn,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: on ? colors.ink : colors.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 16,
          fontVariant: ["tabular-nums"],
          color: on ? colors.bg : colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Rounded toggle chip (reminder lead times). */
export function ToggleChip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: on ? colors.ink : colors.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? colors.paper : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Labelled on/off switch (Hide dust). */
export function Toggle({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 44,
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          padding: 2,
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: on ? colors.yellow : colors.paper,
          alignItems: on ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink }} />
      </View>
      <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

/** Small round-ended button: "+ Add", "Sort: Value ⌄". */
export function PillButton({
  label,
  onPress,
  icon,
  trailingIcon,
  accessibilityLabel,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  trailingIcon?: IconName;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      {icon !== undefined ? <Icon name={icon} size={16} weight={2.5} /> : null}
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.ink }}>{label}</Text>
      {trailingIcon !== undefined ? <Icon name={trailingIcon} size={16} weight={2.5} /> : null}
    </Pressable>
  );
}

// --------------------------------------------------------------- lists

/** Numbered how-it-works list (01 / 02 / 03), ruled between rows. */
export function Steps({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <View>
      {items.map((item, index) => (
        <View
          key={item.title}
          style={{
            flexDirection: "row",
            gap: 14,
            paddingVertical: 14,
            borderTopWidth: space.rule,
            borderTopColor: colors.line,
          }}
        >
          <Text
            style={{
              width: 28,
              fontFamily: font.bold,
              fontSize: 13,
              fontVariant: ["tabular-nums"],
              color: colors.ink,
              paddingTop: 2,
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
              {item.title}
            </Text>
            <Text
              style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.mute }}
            >
              {item.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Ticked list. `boxed` puts it on a ruled card. */
export function TickList({ items, boxed }: { items: string[]; boxed?: boolean }) {
  const list = (
    <View style={{ gap: boxed ? 10 : 8 }}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={{ marginTop: 1 }}>
            <Icon name="check" size={18} weight={3} />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: font.regular,
              fontSize: 15,
              lineHeight: 21,
              color: colors.ink,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
  return boxed ? <Card>{list}</Card> : list;
}

/** Icon + text note. `dashed` for asides, `yellow` for "we'll remind you". */
export function Note({
  icon,
  children,
  tone = "dashed",
}: {
  icon: IconName;
  children: string;
  tone?: "dashed" | "yellow";
}) {
  const yellow = tone === "yellow";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: yellow ? "center" : "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: space.radiusTile,
        borderWidth: space.rule,
        borderStyle: yellow ? "solid" : "dashed",
        borderColor: yellow ? colors.ink : colors.quiet,
        backgroundColor: yellow ? colors.yellow : "transparent",
      }}
    >
      <Icon name={icon} size={20} />
      <Text
        style={{
          flex: 1,
          fontFamily: yellow ? font.bold : font.regular,
          fontSize: 14,
          lineHeight: 20,
          color: colors.ink,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** Ruled list row with icon, two lines, and a trailing control. */
export function ActionRow({
  icon,
  title,
  sub,
  subTone,
  action,
  first,
}: {
  icon?: IconName;
  title: string;
  sub?: string;
  /** "label-first" puts the small muted line above the bold one (Alerts). */
  subTone?: "below" | "label-first" | "warn";
  action?: ReactNode;
  first?: boolean;
}) {
  const labelFirst = subTone === "label-first" || subTone === "warn";
  const small =
    sub !== undefined ? (
      <Text
        numberOfLines={2}
        style={{
          fontFamily: font.regular,
          fontSize: labelFirst ? 12 : 13,
          lineHeight: 18,
          color: colors.mute,
        }}
      >
        {labelFirst ? title : sub}
      </Text>
    ) : null;
  const big = (
    <Text
      numberOfLines={1}
      style={{
        fontFamily: font.bold,
        fontSize: 15,
        color: subTone === "warn" ? colors.claim : colors.ink,
      }}
    >
      {labelFirst ? sub : title}
    </Text>
  );
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: labelFirst ? 10 : 12,
        borderTopWidth: first ? 0 : space.rule,
        borderTopColor: colors.line,
      }}
    >
      {icon !== undefined ? <Icon name={icon} size={20} /> : null}
      <View style={{ flex: 1, gap: labelFirst ? 1 : 2, minWidth: 0 }}>
        {labelFirst ? small : big}
        {labelFirst ? big : small}
      </View>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------- fields

/** Labelled text field. `hint` sits after the label in mute. */
export function TextField({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label?: string; hint?: string; error?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      {label !== undefined ? (
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
          {label}
          {hint !== undefined ? (
            <Text style={{ fontFamily: font.regular, color: colors.mute }}>{` · ${hint}`}</Text>
          ) : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.mute}
        accessibilityLabel={label}
        {...input}
        style={{
          height: 52,
          paddingHorizontal: 14,
          borderRadius: space.radiusBtn,
          borderWidth: space.rule,
          borderColor: error ? colors.claim : colors.ink,
          backgroundColor: colors.paper,
          fontFamily: font.medium,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    </View>
  );
}
