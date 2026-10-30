/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        helm: {
          bg: "#000000",
          card: "#0a0a0a",
          border: "#1f1f1f",
          borderStrong: "#2a2a2a",
          hover: "#141414",
          accent: "#c17f59",
          accentHover: "#a8674a",
          accentSecondary: "#d4a373",
          text: "#fafafa",
          muted: "#a1a1aa",
          subtle: "#71717a",
        },
        // Muted terracotta accent scale — replaces the old violet/indigo brand
        // color. Toned-down/desaturated on purpose, single-hue everywhere
        // (no gradients), used via violet-*-style shade numbers so the
        // existing `violet-300/400/500/600` utility classes map here.
        accent: {
          300: "#e0b49b",
          400: "#d29876",
          500: "#c17f59",
          600: "#a8674a",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = tailwindConfig;
