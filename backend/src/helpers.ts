import type { Express, RequestHandler } from "express";
import type { ZodError } from "zod";
import { z } from "zod";

export type RouteApp = Pick<Express, "get" | "put" | "post" | "delete" | "patch">;
export type Empty = Record<string, never>;
export interface ErrorResponse { error: string };
export type RouteHandler<P, ResBody, ReqBody = unknown, ReqQuery = Record<string, string>> =
    RequestHandler<P, ResBody | ErrorResponse, ReqBody, ReqQuery>;

export const MAX_JSON_BYTES = 65_536;

export const nowIso = (): string => new Date().toISOString();

export const formatZodError = (error: ZodError): string => {
  const issue = error.issues[0];
  if (!issue) { return "Invalid payload"; }
  const path = issue.path.map(key => String(key)).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
};

export const checkJsonSize = (value: Record<string, unknown>, ctx: z.RefinementCtx): void => {
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_JSON_BYTES) {
    ctx.addIssue({ code: "custom", message: `Serialized JSON exceeds ${String(MAX_JSON_BYTES)} bytes` });
  }
};

export const jsonObject = (): z.ZodPipe<z.ZodString, z.ZodTransform<Record<string, unknown>>> => z.string().transform((s, ctx) => {
  try { return JSON.parse(s) as Record<string, unknown>; } catch {
    ctx.addIssue({ code: "custom", message: "Invalid JSON" });
    return z.NEVER;
  }
}).superRefine(checkJsonSize);
