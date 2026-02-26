export type HelloRequest = {
  name?: string;
};

export type HelloResponse = {
  message: string;
};

export const API_VERSION = "v1";

export function makeHelloMessage(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `Hello, ${trimmed}!` : "Hello, world!";
}
