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
        road: {
          950: "#1a1209",
          900: "#2d1f12",
          800: "#3d2a18",
        },
        poop: {
          950: "#1a1209",
          900: "#2d1f12",
          800: "#3d2a18",
          700: "#5c4228",
          600: "#7a5634",
        },
        signal: {
          green: "#7cb342",
          amber: "#d4a574",
        },
        caramel: "#e8b86d",
        cream: "#f5e6d3",
        steam: "#b8a090",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        mound: "0 8px 24px rgba(42, 26, 10, 0.45), inset 0 1px 0 rgba(255, 220, 180, 0.08)",
        "mound-sm": "0 4px 12px rgba(42, 26, 10, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
