export type ID = string;

export type Timestamp = string;

export type OrganizationRole = "ADMIN" | "MEMBER";

export const organizationRoles: ReadonlySet<OrganizationRole> = new Set(["ADMIN", "MEMBER"]);

export interface User {
  id: ID;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Organization {
  id: ID;
  name: string;
  slug: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrganizationMember {
  id: ID;
  organizationId: ID;
  userId: ID;
  role: OrganizationRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Project {
  id: ID;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RunStatus = "queued" | "running" | "finished" | "failed" | "canceled";

export interface Run {
  id: ID;
  projectId: ID;
  name: string;
  status: RunStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface Artifact {
  id: ID;
  runId: ID;
  name: string;
  type: string;
  version: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  uri?: string;
  metadata?: Record<string, unknown>;
}

export interface Metric {
  id: ID;
  runId: ID;
  name: string;
  value: number;
  step?: number;
  timestamp: Timestamp;
}

export const API_VERSION = "v1";
