import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{astro,html,ts,tsx,js,mjs,md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          yellow: "hsl(var(--accent-yellow))",
          lime: "hsl(var(--accent-lime))",
          sage: "hsl(var(--accent-sage))",
          "sage-line": "hsl(var(--accent-sage-line))",
          sky: "hsl(var(--accent-sky))",
          red: "hsl(var(--accent-red))",
        },
        tile: {
          line: "hsl(var(--tile-line))",
          soft: "hsl(var(--tile-soft))",
        },
        ink: "hsl(var(--ink))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
