import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        gold: {
          DEFAULT: "#D4A853",
          light:   "#E8B84B",
        },
      },
      boxShadow: {
        // Soft premium depth scale for the Owner/Artist/Client portal + Auth
        // light system. Level 1 is Tailwind's own `shadow-sm`. Corrected
        // 2026-08-25: the original 2/3 levels were too subtle to register as
        // "floating" at rest — Siam rejected the flat result. These are the
        // resting-state shadows for standard/premium cards respectively, not
        // hover-only accents; elevation-4 is the peak (hover/active) state on
        // premium surfaces. A faint violet tint (not pure neutral gray) is
        // mixed into the ambient layer on purpose — a "glow", not a shadow.
        "elevation-2": "0 1px 2px rgba(24,18,43,0.05), 0 1px 1px rgba(24,18,43,0.04), 0 8px 20px -4px rgba(76,29,149,0.10)",
        "elevation-3": "0 2px 4px rgba(24,18,43,0.06), 0 1px 1px rgba(24,18,43,0.04), 0 16px 36px -6px rgba(76,29,149,0.16), inset 0 1px 0 rgba(255,255,255,0.6)",
        "elevation-4": "0 4px 8px rgba(24,18,43,0.08), 0 2px 2px rgba(24,18,43,0.05), 0 28px 56px -10px rgba(76,29,149,0.24), inset 0 1px 0 rgba(255,255,255,0.7)",
      },
    },
  },
  plugins: [],
};
export default config;
