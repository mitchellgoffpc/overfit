import type { ID } from "@underfit/types";
import type { Express } from "express";

export type RouteApp = Pick<Express, "get" | "put" | "post" | "delete">;
export interface RouteParams { id: ID };
export interface ErrorResponse { error: string };
