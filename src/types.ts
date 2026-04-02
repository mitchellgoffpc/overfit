export type ID = string;
export type Handle = string;
export type Timestamp = string;
export type MediaType = "image" | "video" | "audio";
export type RunStatus = "queued" | "running" | "finished" | "failed" | "cancelled";
export type OrganizationRole = "ADMIN" | "MEMBER";
export type ProjectVisibility = "private" | "public";
export type ArtifactStatus = "open" | "finalized";

export interface Account {
  id: ID;
  handle: Handle;
}

export interface User extends Account {
  type: "USER";
  email: string;
  name: string;
  bio: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Organization extends Account {
  type: "ORGANIZATION";
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Project {
  id: ID;
  owner: Handle;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Collaborator {
  id: ID;
  projectId: ID;
  userId: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Run {
  id: ID;
  projectId: ID;
  user: Handle;
  projectName: string;
  projectOwner: Handle;
  name: string;
  status: RunStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  config: Record<string, unknown> | null;
}

export interface Artifact {
  id: ID;
  projectId: ID;
  runId: ID | null;
  step: number | null;
  name: string;
  type: string;
  status: ArtifactStatus;
  storageKey: string;
  declaredFileCount: number;
  uploadedFileCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  finalizedAt: Timestamp | null;
  metadata: Record<string, unknown> | null;
}

export interface Media {
  id: ID;
  runId: ID;
  key: string;
  step: number | null;
  type: MediaType;
  storageKey: string;
  count: number;
  metadata: Record<string, unknown> | null;
  createdAt: Timestamp;
}

export interface Scalar {
  step: number | null;
  values: Record<string, number>;
  timestamp: Timestamp;
}

export interface LogEntry {
  startLine: number;
  endLine: number;
  content: string;
  startAt: Timestamp;
  endAt: Timestamp;
}

export interface LogPage {
  entries: LogEntry[];
  nextCursor: number;
  hasMore: boolean;
}

export interface ApiKey {
  id: ID;
  userId: ID;
  label: string | null;
  createdAt: Timestamp;
}

export interface ApiKeyWithToken extends ApiKey {
  token: string;
}

export const API_BASE = "/api/v1";
