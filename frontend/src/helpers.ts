import { API_VERSION } from "@underfit/types";
import type { Project } from "@underfit/types";

interface APISuccessResponse<T> { ok: true; body: T; error?: never; status: number };
interface APIFailureResponse { ok: false; body?: never; error: string; status: number };
type APIResponse<T> = APISuccessResponse<T> | APIFailureResponse;

export const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const request = async <T>(path: string, init?: RequestInit): Promise<APIResponse<T>> => {
  const url = path.startsWith("/") ? `${apiBase}${path}` : `${apiBase}/${path}`;
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

export const buildProjectNameMap = (projects: Project[]): Map<string, string> => {
  return new Map(projects.map((project) => [project.id, project.name]));
};
