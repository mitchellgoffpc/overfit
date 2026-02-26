import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "frontend/vite.config.ts",
  "backend/vitest.config.ts",
  "shared/vitest.config.ts"
]);
