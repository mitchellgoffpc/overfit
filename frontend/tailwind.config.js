/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#f2f6f6",
          surface: "#ffffff",
          surfaceMuted: "#f7faf9",
          text: "#0e1b1b",
          textMuted: "#5b6b6b",
          accent: "#1a7b7d",
          accentStrong: "#0f5859",
          border: "#d9e4e4",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(12, 36, 36, 0.08)",
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        display: ["Fraunces", "serif"],
        headline: ["Sora", "Space Grotesk", "system-ui", "sans-serif"],
        mono: ["SFMono-Regular", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
