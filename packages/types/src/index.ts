export const organizationRoles = ["ADMIN", "MEMBER"] as const;
export const accountTypes = ["USER", "ORGANIZATION"] as const;

export type ID = string;
export type Timestamp = string;
export type RunStatus = "queued" | "running" | "finished" | "failed" | "canceled";
export type OrganizationRole = (typeof organizationRoles)[number];
export type AccountType = (typeof accountTypes)[number];

export interface Account {
  id: ID;
  handle: string;
  displayName: string;
  type: AccountType;
}

export interface User extends Account {
  email: string;
  name: string | null;
  bio: string | null;
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

export interface Organization extends Account {
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
  accountId: ID;
  name: string;
  description: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Run {
  id: ID;
  projectId: ID;
  userId: ID;
  name: string;
  status: RunStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: Record<string, unknown> | null;
}

export interface Artifact {
  id: ID;
  runId: ID;
  name: string;
  type: string;
  version: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  uri: string | null;
  metadata: Record<string, unknown> | null;
}

export interface Metric {
  id: ID;
  runId: ID;
  name: string;
  value: number;
  step: number | null;
  timestamp: Timestamp;
}

export interface ApiKey {
  id: ID;
  userId: ID;
  label: string | null;
  token: string;
  createdAt: Timestamp;
}

export const API_VERSION = "v1";
export const API_BASE = `/api/${API_VERSION}`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export const USERNAME_HINT = "Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.";
export const PASSWORD_HINT = "Password should be at least 8 characters and include a number and a letter.";
export const EMAIL_INVALID_ERROR = "Invalid email address";
export const EMAIL_IN_USE_ERROR = "Email address is already associated with an account";
export const USERNAME_IN_USE_ERROR = "Username is already associated with an account";
export const SESSION_TOKEN_REQUIRED_ERROR = "Session token is required";
export const SESSION_INVALID_ERROR = "Session is invalid or expired";
export const CREDENTIALS_INVALID_ERROR = "Invalid credentials";

export const testEmail = (value: string): string | null => (
  EMAIL_PATTERN.test(value) ? null : EMAIL_INVALID_ERROR
);

export const testHandle = (value: string): string | null => (
  HANDLE_PATTERN.test(value) ? null : USERNAME_HINT
);

export const testPassword = (value: string): string | null => {
  const issues: string[] = [];
  if (value.length < 8) { issues.push("be at least 8 characters"); }
  if (!/[A-Za-z]/.test(value)) { issues.push("include a letter"); }
  if (!/\d/.test(value)) { issues.push("include a number"); }
  return issues.length ? `Password must ${new Intl.ListFormat("en").format(issues)}.` : null;
};
