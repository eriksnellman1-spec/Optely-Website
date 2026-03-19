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
        bg: "#09090B",
        surface: "#111113",
        "surface-2": "#16161A",
        border: "#1F1F23",
        accent: "#2563EB",
        "accent-light": "#60A5FA",
        muted: "#A1A1AA",
        success: "#22C55E",
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        dm: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        glow: {
          from: { boxShadow: "0 0 10px rgba(37,99,235,0.3)" },
          to: { boxShadow: "0 0 30px rgba(37,99,235,0.7)" },
        },
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(37,99,235,0.5)",
        "glow-blue-sm": "0 0 10px rgba(37,99,235,0.3)",
        "glow-blue-lg": "0 0 40px rgba(37,99,235,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
