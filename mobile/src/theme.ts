// The landing palette (landing/src/styles/global.css, lib/tones.ts). Yellow is
// the one loud colour; lime is live/alive; orange is grace; sage and sky are
// the low-chroma companions. Pages sit on tile-soft, surfaces are white with
// an ink rule — the mobile redesign's look, minus its offset shadows.
export const colors = {
  /** Page. tile-soft. */
  bg: "#F1F1EE",
  /** Cards, inputs, sheets' controls. */
  paper: "#FFFFFF",
  ink: "#0A0A0A",
  mute: "#666666",
  /** tile-line: hairlines between rows. */
  line: "#E1E1DB",
  /** Unpicked option borders and dashed placeholders. */
  quiet: "#A3A3A3",
  soft: "#F1F1EE",
  yellow: "#FFD400",
  lime: "#A1E633",
  orange: "#FF7B00",
  /** Grace-period stops on the reminder timeline, before the heir is told. */
  orangeSoft: "#FFD9B3",
  sage: "#C8D7C1",
  sky: "#BED5E4",
  claim: "#FF3838",
  white: "#FFFFFF",
  /** Dashed border of a primary button that isn't ready yet. */
  disabledRule: "#8A877D",
  /** Credential chip and ring. */
  brass: "#C9A54A",
  /** Face of a drawn credential card. */
  cardFace: "#1A1A1A",
  /** Dim behind bottom sheets. */
  scrim: "rgba(10,10,10,0.55)",
} as const;

export const space = {
  pad: 20,
  tile: 16,
  gap: 12,
  /** Buttons, inputs, segmented chips. */
  radiusBtn: 12,
  /** Small inline buttons (Add, Edit, Lock now). */
  radiusSmall: 10,
  radiusTile: 16,
  radiusHero: 20,
  /** Every ruled surface. */
  rule: 2,
} as const;

export const font = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
} as const;

/** Floating chrome (tab bar, Tap button) sits on a soft drop, never an offset one. */
export const floatShadow = {
  shadowColor: colors.ink,
  shadowOpacity: 0.14,
  shadowRadius: 15,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
} as const;
