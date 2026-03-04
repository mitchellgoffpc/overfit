import type { ID } from "@overfit/types";
import type { Express } from "express";

export type RouteApp = Pick<Express, "get" | "put" | "delete">;
export interface RouteParams { id: ID };
export interface ErrorResponse { error: string };

export const nowIso = (): string => new Date().toISOString();
