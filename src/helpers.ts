import { API_BASE } from "types";

const mergeCache = new WeakMap<object, WeakMap<object, object>>();
export const cachedMerge = <A extends object, B extends object>(a: A, b: B): A & B => {
  let inner = mergeCache.get(a);
  if (!inner) { inner = new WeakMap(); mergeCache.set(a, inner); }
  let result = inner.get(b);
  if (!result) { result = { ...a, ...b }; inner.set(b, result); }
  return result as A & B;
};

export const RULED_LINE_HEIGHT = 1.875;
export const RULED_LINE = `${String(RULED_LINE_HEIGHT)}rem`;
export const TABLE_HEADER_CELL_CLASS = "flex items-center whitespace-nowrap px-2.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted";
export const TABLE_BODY_CELL_CLASS = "flex items-center whitespace-nowrap px-2.5 text-[0.75rem] text-brand-text";

interface APISuccessResponse<T> { ok: true; body: T; error?: never; status: number };
interface APIFailureResponse { ok: false; body?: never; error: string; status: number };
export type APIResponse<T> = APISuccessResponse<T> | APIFailureResponse;
export type ActionResult<T = never> = [T] extends [never] ? { ok: true } | { ok: false; error: string } : { ok: true; body: T } | { ok: false; error: string };

export const request = async <T>(path: string, init?: RequestInit): Promise<APIResponse<T>> => {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const requestInit = init ? { credentials: "include" as const, ...init } : { credentials: "include" as const };
  try {
    const response = await fetch(url, requestInit);
    const payload = await response.json().catch(() => null) as T | {error: string} | null;

    if (!response.ok) {
      const error = payload && typeof payload === "object" && "error" in payload ? payload.error : `Request failed with status ${String(response.status)}`;
      return { ok: false, status: response.status, error };
    } else if (payload) {
      return { ok: true, status: response.status, body: payload as T };
    } else {
      return { ok: false, status: response.status, error: "Invalid response" };
    }
  } catch (error) {
    return { ok: false, status: -1, error: error instanceof Error ? error.message : "Request failed" };
  }
};

type SendMethod = "POST" | "PATCH" | "PUT";

export const send = async <T>(path: string, method: SendMethod, payload: Record<string, unknown>): Promise<APIResponse<T>> =>
  await request(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

export const getInitials = (name: string): string => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export const formatDate = (timestamp: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) { return "Unknown"; }
  return date.toLocaleDateString("en-US", options ?? { month: "short", day: "numeric" });
};

export const formatRunTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) { return "Unknown time"; }
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export const formatDuration = (start: string, end: string): string => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) { return "—"; }
  const deltaMs = Math.max(0, endTime - startTime);
  const totalSeconds = Math.floor(deltaMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) { return `${hours.toString()}h ${minutes.toString()}m`; }
  if (minutes > 0) { return `${minutes.toString()}m ${seconds.toString()}s`; }
  return `${seconds.toString()}s`;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const USERNAME_HINT = "Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.";
export const SLUG_HINT = "Name may only contain alphanumeric characters, hyphens, underscores, or periods, and must start with an alphanumeric character.";
export const PASSWORD_HINT = "Password should be at least 8 characters and include a number and a letter.";
export const EMAIL_INVALID_ERROR = "Invalid email address";
export const EMAIL_IN_USE_ERROR = "Email address is already associated with an account";
export const USERNAME_IN_USE_ERROR = "Username is already associated with an account";
export const CREDENTIALS_INVALID_ERROR = "Invalid credentials";

export const testEmail = (value: string): string | null => (
  EMAIL_PATTERN.test(value) ? null : EMAIL_INVALID_ERROR
);

export const testHandle = (value: string): string | null => (
  HANDLE_PATTERN.test(value) ? null : USERNAME_HINT
);

export const testSlug = (value: string): string | null => (
  SLUG_PATTERN.test(value) ? null : SLUG_HINT
);

export const testPassword = (value: string): string | null => {
  const issues: string[] = [];
  if (value.length < 8) { issues.push("be at least 8 characters"); }
  if (!/[A-Za-z]/.test(value)) { issues.push("include a letter"); }
  if (!/\d/.test(value)) { issues.push("include a number"); }
  return issues.length ? `Password must ${new Intl.ListFormat("en").format(issues)}.` : null;
};
