import type { ID, Scalar } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { table as projectsTable } from "repositories/projects";
import { table as runsTable } from "repositories/runs";

const table = "scalars";

export interface ScalarRow {
  id: string;
  runId: string;
  step: number | null;
  values: string;
  timestamp: string;
}

const toScalar = (row: ScalarRow): Scalar => ({
  ...row,
  values: JSON.parse(row.values) as Record<string, number>,
});

export const createScalarsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("step", "integer")
    .addColumn("values", "text", (col) => col.notNull())
    .addColumn("timestamp", "text", (col) => col.notNull())
    .execute();
};

export const listScalars = async (db: Database, runId: ID): Promise<Scalar[]> => {
  const rows = await db.selectFrom(table).selectAll().where("runId", "=", runId).orderBy("step", "asc").execute();
  return rows.map(toScalar);
};

export const listScalarsByHandleProjectNameAndRunName = async (db: Database, handle: string, projectName: string, runName: string): Promise<Scalar[]> => {
  const rows = await db
    .selectFrom(table)
    .innerJoin(runsTable, `${runsTable}.id`, `${table}.runId`)
    .innerJoin(projectsTable, `${projectsTable}.id`, `${runsTable}.projectId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${projectsTable}.accountId`)
    .selectAll(table)
    .where(`${accountsTable}.handle`, "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .where(`${runsTable}.name`, "=", runName)
    .orderBy(`${table}.step`, "asc")
    .execute();
  return rows.map(toScalar);
};

export const insertScalar = async (db: Database, scalar: Scalar): Promise<Scalar> => {
  const row: ScalarRow = { ...scalar, values: JSON.stringify(scalar.values) };
  await db.insertInto(table).values(row).execute();
  return scalar;
};
