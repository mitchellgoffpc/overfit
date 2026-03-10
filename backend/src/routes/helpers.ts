import type { ID } from "@underfit/types";
import type { Express, RequestHandler } from "express";

export type RouteApp = Pick<Express, "get" | "put" | "post" | "delete" | "patch">;
export interface RouteParams { id: ID };
export interface ErrorResponse { error: string };
export type RouteHandler<P, ResBody, ReqBody = unknown, ReqQuery = Record<string, string>> =
    RequestHandler<P, ResBody | ErrorResponse, ReqBody, ReqQuery>;
