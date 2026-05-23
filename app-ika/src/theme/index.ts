import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        background: { value: "#ffffff" },
        foreground: { value: "#000000" },
        card: { value: "#ffffff" },
        secondary: { value: "#f2f2f2" },
        muted: { value: "#f2f2f2" },
        "muted-foreground": { value: "#333333" },
        border: { value: "#000000" },
        accent: {
          pink: { value: "#ff52d8" },
          lime: { value: "#ccff00" },
          cyan: { value: "#00f0ff" },
          orange: { value: "#ff9500" },
          purple: { value: "#8b5cf6" },
          yellow: { value: "#ffcc00" },
          red: { value: "#ff3333" },
        },
      },
      fonts: {
        body: { value: '"Space Grotesk", system-ui, sans-serif' },
        heading: { value: '"Space Grotesk", system-ui, sans-serif' },
        mono: { value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
      },
      radii: {
        neo: { value: "1rem" },
        "neo-lg": { value: "1.5rem" },
        "neo-sm": { value: "0.5rem" },
      },
    },
    semanticTokens: {
      colors: {
        "chakra-body-bg": { value: "{colors.background}" },
        "chakra-body-text": { value: "{colors.foreground}" },
      },
    },
    keyframes: {
      slideUp: {
        from: { opacity: "0", transform: "translateY(24px)" },
        to: { opacity: "1", transform: "translateY(0)" },
      },
      shake: {
        "0%, 100%": { transform: "translateX(0)" },
        "25%": { transform: "translateX(-8px)" },
        "50%": { transform: "translateX(8px)" },
        "75%": { transform: "translateX(-4px)" },
      },
      glowLime: {
        "0%, 100%": { boxShadow: "8px 8px 0px 0px #000" },
        "50%": { boxShadow: "12px 12px 0px 0px #000, 0 0 20px rgba(204,255,0,0.3)" },
      },
      spin: {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
      pulseSlow: {
        "0%, 100%": { opacity: "1" },
        "50%": { opacity: "0.5" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
