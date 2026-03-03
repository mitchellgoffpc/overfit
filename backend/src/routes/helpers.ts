import type { Express } from "express";

export interface ErrorResponse {
  error: string;
}

export type ID = string;

export type RouteApp = Pick<Express, "get" | "put">;
