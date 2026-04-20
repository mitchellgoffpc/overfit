import { colors } from "./src/colors.ts";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      colors: {
        brand: colors.brand,
        ink: colors.ink,
        hover: colors.hover,
        code: colors.code,
        nav: colors.nav,
        log: colors.log,
        file: colors.file,
        notebook: colors.notebook,
        pill: colors.pill,
        danger: colors.danger,
        success: colors.success,
        signal: colors.signal,
        chart: colors.chart,
        heatmap: colors.heatmap,
        "status-queued": colors.status.queued,
        "status-running": colors.status.running,
        "status-finished": colors.status.finished,
        "status-failed": colors.status.failed,
        "status-cancelled": colors.status.cancelled,
      },
      boxShadow: {
        soft: "0 10px 30px rgba(12, 36, 36, 0.08)",
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "serif"],
        headline: ["Sora", "Space Grotesk", "system-ui", "sans-serif"],
        mono: ["SFMono-Regular", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
