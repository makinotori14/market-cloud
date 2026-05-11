import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f6fbff",
        foreground: "#07111f",
        border: "#d9e8f5",
        muted: "#5d6b7c",
        primary: "#0077ff",
        accent: "#00a7e8",
      },
      borderRadius: {
        ui: "8px",
      },
      boxShadow: {
        panel: "0 24px 70px rgba(6, 59, 111, 0.14)",
      },
      fontFamily: {
        sans: ["VTB Group UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
