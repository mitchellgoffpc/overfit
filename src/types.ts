export type ID = string;
export type Handle = string;
export type Timestamp = string;
export type MediaType = "image" | "video" | "audio" | "html";
export type RunTerminalState = "finished" | "failed" | "cancelled";
export type RunStatus = "running" | "finished" | "failed" | "cancelled" | "inactive";
export type OrganizationRole = "ADMIN" | "MEMBER";
export type ProjectVisibility = "private" | "public";

export interface Account {
  id: ID;
  handle: Handle;
}

export interface User extends Account {
  type: "USER";
  email: string;
  name: string;
  bio: string;
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
  metadata: Record<string, unknown>;
  visibility: ProjectVisibility;
  pendingTransferTo: ID | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Run {
  id: ID;
  projectId: ID;
  user: Handle;
  projectName: string;
  projectOwner: Handle;
  launchId: string;
  name: string;
  terminalState: RunTerminalState | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  config: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  uiState: Record<string, unknown>;
  isPinned: boolean;
  isBaseline: boolean;
  summary: Record<string, number>;
  workerToken: string | null;
}

export type RunUIState = Partial<Pick<Run, "uiState" | "isPinned" | "isBaseline">>;

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

export interface ScalarAxis {
  steps: (number | null)[];
  timestamps: Timestamp[];
}

export interface ScalarSeriesValues {
  axis: number;
  values: number[];
}

export interface ScalarSeries {
  resolution: number;
  axes: ScalarAxis[];
  series: Record<string, ScalarSeriesValues>;
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
  tokenPrefix: string;
  createdAt: Timestamp;
}

export interface ApiKeyWithToken extends ApiKey {
  token: string;
}

export interface Worker {
  id: ID;
  runId: ID;
  workerLabel: string;
  workerToken: string | null;
  lastHeartbeat: Timestamp;
  joinedAt: Timestamp;
}

export const API_BASE = "/api/v1";
