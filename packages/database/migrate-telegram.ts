import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: "../../.env" });

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgres://adms:adms123@localhost:5432/adms_db",
});

async function run() {
	const client = await pool.connect();
	try {
		console.log("Starting migration for Telegram ID...");
		await client.query("BEGIN");

		// Add new column
		await client.query(
			`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "telegram_chat_id" varchar(50) UNIQUE`,
		);

		await client.query("COMMIT");
		console.log("Migration successful!");
	} catch (e) {
		await client.query("ROLLBACK");
		console.error("Migration failed:", e);
	} finally {
		client.release();
		pool.end();
	}
}

run();
