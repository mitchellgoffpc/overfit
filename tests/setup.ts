import "@testing-library/jest-dom/vitest";

Reflect.set(globalThis, "__underfitFetch__", globalThis.fetch);
