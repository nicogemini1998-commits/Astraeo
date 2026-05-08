import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Playfair Display", "Georgia", "serif"],
        sans:    ["Space Grotesk", "Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
        ui:      ["Space Grotesk", "Inter", "sans-serif"],
      },
      colors: {
        a: {
          base:     "#0A0908",
          elevated: "#100F0D",
          surface:  "#161410",
          surface2: "#1C1A16",
          border:   "#252318",
          indigo:   "#6F5BFF",
          indigo2:  "#9B8FFF",
          sky:      "#38BDF8",
          emerald:  "#34D399",
          amber:    "#C99647",
          rose:     "#E05A6B",
          violet:   "#A78BFA",
          ok:       "#5BA66B",
          warn:     "#C99647",
          danger:   "#C75353",
          text1:    "#F0EDE6",
          text2:    "#8A8A97",
          muted:    "#4A4A5A",
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        float:        "float 6s ease-in-out infinite",
        twinkle:      "twinkle 3s ease-in-out infinite",
        scan:         "scan 4s linear infinite",
        "slide-in":   "slideIn 0.3s ease-out",
        "fade-in":    "fadeIn 0.4s ease-out",
        "scale-in":   "scaleIn 0.2s ease-out",
        "spin-slow":  "spin 8s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 16px rgba(111,91,255,0.12)" },
          "50%":      { boxShadow: "0 0 32px rgba(111,91,255,0.32)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.15", transform: "scale(0.8)" },
          "50%":      { opacity: "0.8",  transform: "scale(1.2)" },
        },
        scan: {
          "0%":   { top: "0%" },
          "100%": { top: "100%" },
        },
        slideIn: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { transform: "scale(0.95)", opacity: "0" },
          to:   { transform: "scale(1)",    opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
