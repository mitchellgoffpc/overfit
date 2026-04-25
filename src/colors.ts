export const colors = {
  brand: {
    bg: "#f2f6f6",
    bgStrong: "#e9efed",
    surface: "#ffffff",
    surfaceMuted: "#f7faf9",
    surfaceTinted: "#f9fcfb",
    text: "#0e1b1b",
    textMuted: "#5b6b6b",
    accent: "#1a7b7d",
    accentStrong: "#0f5859",
    accentMuted: "#d9ecec",
    border: "#d9e4e4",
    borderMuted: "#d2dfdf",
    borderStrong: "#c4d1d1",
  },
  ink: { DEFAULT: "#1f3637", hover: "#152a2b" },
  hover: { DEFAULT: "#f0f5f4", subtle: "#f5f9f9" },
  code: { bg: "#f3f7f6", text: "#1b3a3b", highlight: "#e1f2f2" },
  nav: { bg: "#f0f6f7", tabActive: "#b9cbcb", tabInactive: "#cfdada" },
  log: { text: "#2f3e41", textMuted: "#243336", badge: "#d6e3e5" },
  file: { folder: "#2a5c4e", rowHover: "#f0f5f3" },
  notebook: { bg: "#f8fcfa", shadow: "#dce7e4", marginLine: "#efb1b1" },
  pill: { bg: "#eef5f4", border: "#c8d6d6" },
  status: {
    queued: { bg: "#f8eee0", text: "#8c5a1a", border: "#e9d7bf" },
    running: { bg: "#e3f3f2", text: "#0f5859", border: "#cbe2e1" },
    finished: { bg: "#e6f3ea", text: "#1e5b36", border: "#cfe6d7" },
    failed: { bg: "#fde8e6", text: "#b42318", border: "#f7c8c2" },
    cancelled: { bg: "#eef1f3", text: "#4a5560", border: "#d7dde2" },
  },
  danger: { bg: "#fee4e2", text: "#b42318", border: "#fecaca", borderHover: "#f87171", bgHover: "#fee2e2" },
  success: { bg: "#e9f8ee", text: "#1e5b36", border: "#bde4c7" },
  signal: { running: "#24b26b", failed: "#bb5f5f", accent: "#2d7172" },
  chart: { bg: "#ffffff", grid: "#edf2f2", axis: "#d7e2e2", text: "#627070", hover: "#8fd0d1" },
  heatmap: { level0: "#e7ecef", level1: "#cbe7e1", level2: "#8fd3c8", level3: "#4fb8aa" },
} as const;

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let channels: [number, number, number];
  if (huePrime < 1) {
    channels = [chroma, x, 0];
  } else if (huePrime < 2) {
    channels = [x, chroma, 0];
  } else if (huePrime < 3) {
    channels = [0, chroma, x];
  } else if (huePrime < 4) {
    channels = [0, x, chroma];
  } else if (huePrime < 5) {
    channels = [x, 0, chroma];
  } else {
    channels = [chroma, 0, x];
  }
  const match = lightness - chroma / 2;
  return channels
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")
    .replace(/^/, "#");
};

export const getRunColor = (runId: string): string => {
  const random = createRandom(hashString(runId));
  const hue = random() * 360;
  const saturation = 0.62 + random() * 0.14;
  const lightness = 0.42 + random() * 0.08;
  return hslToHex(hue, saturation, lightness);
};
