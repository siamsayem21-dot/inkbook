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
        // light system. Level 1 is Tailwind's own `shadow-sm`. These two are
        // additive — deliberately calm, no dark/heavy shadows.
        "elevation-2": "0 1px 2px rgba(24,18,43,0.04), 0 4px 12px rgba(24,18,43,0.06)",
        "elevation-3": "0 2px 4px rgba(24,18,43,0.05), 0 12px 32px rgba(24,18,43,0.09)",
      },
    },
  },
  plugins: [],
};
export default config;
