import type { Artifact, ID, Metric, Project, Run, Team, User } from "@overfit/types";
import type { Express, Request, Response } from "express";

export type { ID } from "@overfit/types";

export interface ErrorResponse { error: string };

export type RouteApp = Pick<Express, "get" | "put">;

export interface RouteParams { id: ID };

export type RouteRequest<Params extends Record<string, string> = Record<string, string>, ResBody = unknown, ReqBody = unknown> = Request<
  Params,
  ResBody,
  ReqBody
>;

export type RouteResponse<ResBody> = Response<ResBody>;

export type UpsertUserPayload = Partial<Omit<User, "id" | "updatedAt">>;
export type UpsertTeamPayload = Partial<Omit<Team, "id" | "updatedAt">>;
export type UpsertProjectPayload = Partial<Omit<Project, "id" | "updatedAt">>;
export type UpsertRunPayload = Partial<Omit<Run, "id" | "updatedAt">>;
export type UpsertArtifactPayload = Partial<Omit<Artifact, "id" | "updatedAt">>;
export type UpsertMetricPayload = Partial<Omit<Metric, "id">>;

export const nowIso = (): string => new Date().toISOString();
