export type ID = string;

export type Timestamp = string;

export type OrganizationRole = "ADMIN" | "MEMBER";

export const organizationRoles: ReadonlySet<OrganizationRole> = new Set(["ADMIN", "MEMBER"]);

export interface User {
  id: ID;
  email: string;
  username: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserAuth {
  id: ID;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordDigest: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Session {
  id: ID;
  userId: ID;
  createdAt: Timestamp;
  expiresAt: Timestamp;
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export const USERNAME_HINT = "Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.";
export const PASSWORD_HINT = "Password should be at least 8 characters and include a number and a letter.";

export const testEmail = (value: string): boolean => EMAIL_PATTERN.test(value);
export const testUsername = (value: string): boolean => USERNAME_PATTERN.test(value);
export const testPassword = (value: string): boolean => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
