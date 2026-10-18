import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade visual Elite Champions League
        navy: {
          DEFAULT: "#0B1426",
          50: "#1B2740",
          100: "#162136",
          900: "#070E1C",
        },
        ink: {
          DEFAULT: "#080A0F",
          50: "#12161F",
        },
        gold: {
          DEFAULT: "#D6B15E",
          light: "#E8C97F",
          dark: "#B8923F",
          muted: "#8A7340",
        },
        paper: "#F5F6F8",
        muted: "#9299A8",
        surface: "#111827",
        surfaceHover: "#1A2333",
        border: "#1F2937",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-live": "pulse-live 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
