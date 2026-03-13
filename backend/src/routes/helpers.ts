import type { ID } from "@underfit/types";
import type { Express, RequestHandler } from "express";
import type { ZodError } from "zod";

export type RouteApp = Pick<Express, "get" | "put" | "post" | "delete" | "patch">;
export interface RouteParams { id: ID };
export interface ErrorResponse { error: string };
export type RouteHandler<P, ResBody, ReqBody = unknown, ReqQuery = Record<string, string>> =
    RequestHandler<P, ResBody | ErrorResponse, ReqBody, ReqQuery>;

export const formatZodError = (error: ZodError): string => {
  const issue = error.issues[0];
  if (!issue) { return "Invalid payload"; }
  const path = issue.path.map(key => String(key)).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
};
