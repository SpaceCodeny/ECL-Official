import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ECL Professional Esports Palette
        background: {
          primary: "#070B14",
          secondary: "#0B1220",
          elevated: "#101A2B",
        },
        surface: {
          DEFAULT: "#101A2B",
          hover: "#16243A",
          border: "#1E2B40",
        },
        electric: {
          DEFAULT: "#1677FF",
          light: "#39A0FF",
          dark: "#0D5BD9",
        },
        gold: {
          DEFAULT: "#F5B942",
          light: "#FFD76E",
          dark: "#D89A2C",
        },
        text: {
          primary: "#F4F7FC",
          secondary: "#8B98AC",
          disabled: "#4A5568",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Rajdhani", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "700" }],
        "display-lg": ["3.5rem", { lineHeight: "1.1", letterSpacing: "0.02em", fontWeight: "700" }],
        "display-md": ["2.5rem", { lineHeight: "1.2", letterSpacing: "0.02em", fontWeight: "700" }],
        "display-sm": ["1.875rem", { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      boxShadow: {
        "glow-electric": "0 0 30px rgba(22, 119, 255, 0.3)",
        "glow-gold": "0 0 40px rgba(245, 185, 66, 0.4)",
        "elevation-1": "0 2px 8px rgba(0, 0, 0, 0.4)",
        "elevation-2": "0 4px 16px rgba(0, 0, 0, 0.5)",
        "elevation-3": "0 8px 32px rgba(0, 0, 0, 0.6)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { 
            opacity: "0.4",
            filter: "brightness(1)",
          },
          "50%": { 
            opacity: "0.8",
            filter: "brightness(1.2)",
          },
        },
        "spin-roulette": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(var(--final-offset))" },
        },
        "reveal-scale": {
          "0%": { 
            transform: "scale(0.8)",
            opacity: "0",
          },
          "100%": { 
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in": "slide-in 0.5s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "spin-roulette": "spin-roulette 5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "reveal-scale": "reveal-scale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "scan-line": "scan-line 4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
