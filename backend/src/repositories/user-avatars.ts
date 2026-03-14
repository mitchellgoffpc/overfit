import type { ID, UserAvatar } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";
import { table as accountsTable } from "repositories/accounts";
import { table as usersTable } from "repositories/users";

const table = "user_avatars";

export const createUserAvatarsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("userId", "text", (col) => col.primaryKey().references("users.id").onDelete("cascade").onUpdate("cascade"))
    .addColumn("image", "blob", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getUserAvatar = async (db: Database, handle: string): Promise<UserAvatar | undefined> => {
  const row = await db
    .selectFrom(table)
    .innerJoin(usersTable, `${usersTable}.id`, `${table}.userId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${usersTable}.id`)
    .select([`${table}.userId as userId`, `${table}.image as image`, `${table}.createdAt as createdAt`, `${table}.updatedAt as updatedAt`])
    .where(`${accountsTable}.handle`, "=", handle)
    .executeTakeFirst();
  return row;
};

export const upsertUserAvatar = async (db: Database, userId: ID, image: Buffer): Promise<boolean> => {
  const timestamp = nowIso();
  const result = await db
    .insertInto(table)
    .values({ userId, image, createdAt: timestamp, updatedAt: timestamp })
    .onConflict((oc) => oc.column("userId").doUpdateSet({ image, updatedAt: timestamp }))
    .executeTakeFirst();
  return Boolean(result.numInsertedOrUpdatedRows);
};

export const deleteUserAvatar = async (db: Database, userId: ID): Promise<boolean> => {
  const result = await db.deleteFrom(table).where("userId", "=", userId).executeTakeFirst();
  return Boolean(result.numDeletedRows);
};
