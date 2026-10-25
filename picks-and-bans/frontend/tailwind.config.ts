import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#D4AF37",
        "gold-light": "#F4D03F",
        "gold-dark": "#9B7E2A",
        ink: "#0A0E14",
        paper: "#F7F7F8",
        muted: "#94A3B8",
        surface: "#1A1F28",
        "surface-hover": "#242933",
        border: "#2D3748",
        navy: "#0F172A",
      },
      fontFamily: {
        display: ["var(--font-rajdhani)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
