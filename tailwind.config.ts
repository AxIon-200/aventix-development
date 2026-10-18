import type { Config } from "tailwindcss";

// Colors/typography come from the Aventix Figma file.
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
          cyan: "#66fcf1",
          cyanHover: "#8afff6",
          cyanGlow: "rgba(102, 252, 241, 0.4)",
          darkBg: "#0b0c10",
          darkCard: "#151b23",
          darkCardHover: "#1f2833",
          border: "#242c36",
          borderLight: "#2c3644",
          line: "#1f2833",
          field: "#1f2833",
          sidebar: "#161d27",
          slateText: "#c5c6c7",
          mutedText: "#8a8b8c",
          softText: "#8fa9a0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        geist: ["var(--font-geist)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 10px rgba(102, 252, 241, 0.4)",
        "glow-lg": "0 0 45px rgba(102, 252, 241, 0.4)",
        "glow-card": "0 10px 30px rgba(102, 252, 241, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
