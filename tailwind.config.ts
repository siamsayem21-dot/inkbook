import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#0A0A0A",
        gold: {
          DEFAULT: "#D4A853",
          light: "#E8C876",
          dark: "#B8903D",
        },
      },
    },
  },
  plugins: [],
};
export default config;
