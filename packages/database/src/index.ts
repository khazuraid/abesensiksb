import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
	process.env.DATABASE_URL || "postgres://adms:adms123@localhost:5432/adms_db";

export const pool = new Pool({
	connectionString,
});

export const db = drizzle(pool, {
	schema,
});

export * from "./schema";
