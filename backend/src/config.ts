import fs from "node:fs";
import path from "node:path";

import * as toml from "@iarna/toml";
import { z } from "zod";

import { LogBufferConfigSchema } from "buffers/logs";
import { DatabaseConfigSchema } from "db";
import { StorageConfigSchema } from "storage";

const ServerConfigSchema = z.strictObject({
  port: z.coerce.number().int().min(1).default(4000)
}).prefault({});

export const AppConfigSchema = z.strictObject({
  server: ServerConfigSchema,
  db: DatabaseConfigSchema,
  storage: StorageConfigSchema,
  logBuffer: LogBufferConfigSchema
}).prefault({});
export type AppConfig = z.infer<typeof AppConfigSchema>;

export const loadConfig = (configPath?: string): AppConfig => {
  if (!configPath) {
    return AppConfigSchema.parse({});
  } else {
    const resolvedPath = path.resolve(process.cwd(), configPath);
    const rawConfig = fs.readFileSync(resolvedPath, "utf-8");
    return AppConfigSchema.parse(toml.parse(rawConfig));
  }
};
