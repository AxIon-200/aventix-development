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
        background: "var(--background)",
        foreground: "var(--foreground)",
        aventix: {
          cyan: "#00e5be",
          cyanHover: "#35f0cb",
          cyanGlow: "rgba(0, 229, 190, 0.4)",
          darkBg: "#0b0f15",
          darkCard: "#131b26",
          darkCardHover: "#182332",
          border: "#1e2a3a",
          borderLight: "#27384e",
          slateText: "#94a3b8",
          mutedText: "#64748b",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px rgba(0, 229, 190, 0.35)",
        "glow-lg": "0 0 45px rgba(0, 229, 190, 0.4)",
        "glow-card": "0 10px 30px rgba(0, 229, 190, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
