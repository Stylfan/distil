import { bigint, customType, text } from "drizzle-orm/pg-core";

/** Column helpers shared by the schema files. Instants are milliseconds since the epoch. */

export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const now = () => Date.now();

export const timestamps = {
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now).$onUpdateFn(now),
};

/** Raw bytes, for a photo that waits to be read and checked; Postgres stores them as bytea. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});
