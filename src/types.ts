export const organizationRoles = ["ADMIN", "MEMBER"] as const;
export const accountTypes = ["USER", "ORGANIZATION"] as const;
export const mediaTypes = ["image", "video", "audio"] as const;
export const runStatus = ["queued", "running", "finished", "failed", "cancelled"] as const;
export const projectVisibility = ["private", "public"] as const;
export const artifactStatus = ["open", "finalized"] as const;

export type ID = string;
export type Handle = string;
export type Timestamp = string;
export type MediaType = (typeof mediaTypes)[number];
export type RunStatus = (typeof runStatus)[number];
export type OrganizationRole = (typeof organizationRoles)[number];
export type AccountType = (typeof accountTypes)[number];
export type ProjectVisibility = (typeof projectVisibility)[number];
export type ArtifactStatus = (typeof artifactStatus)[number];

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

export interface UserAuth {
  id: ID;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordDigest: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AccountAvatar {
  accountId: ID;
  image: Uint8Array;
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
  type: "ORGANIZATION";
  name: string;
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

export interface ScalarSegment {
  id: ID;
  runId: ID;
  resolution: number;
  startLine: number;
  endLine: number;
  startAt: Timestamp;
  endAt: Timestamp;
  byteOffset: number;
  byteCount: number;
  storageKey: string;
  createdAt: Timestamp;
}

export interface LogSegment {
  id: ID;
  runId: ID;
  workerId: string;
  startLine: number;
  endLine: number;
  startAt: Timestamp;
  endAt: Timestamp;
  byteOffset: number;
  byteCount: number;
  storageKey: string;
  createdAt: Timestamp;
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
