export const encodeJson = (value: Record<string, unknown> | null): string | null => (
  value ? JSON.stringify(value) : null
);
export const decodeJson = (value: string | null): Record<string, unknown> | null => (
  value ? JSON.parse(value) as Record<string, unknown> : null
);
