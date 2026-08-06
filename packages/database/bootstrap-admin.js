const { Pool } = require("pg");
const bcrypt = require("bcrypt");

async function bootstrapAdmin() {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	try {
		const {
			rows: [existing],
		} = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
		if (existing) {
			console.log("[bootstrap-admin] Administrator already exists; skipped.");
			return;
		}
		const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
		const password = process.env.ADMIN_PASSWORD;
		const name = process.env.ADMIN_NAME?.trim() || "Administrator";
		if (!email || !password)
			throw new Error(
				"ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi saat belum ada administrator",
			);
		if (password.length < 12)
			throw new Error("ADMIN_PASSWORD minimal 12 karakter");
		const hash = await bcrypt.hash(password, 12);
		await pool.query(
			"INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, 'ADMIN') ON CONFLICT (email) DO NOTHING",
			[email, hash, name],
		);
		console.log("[bootstrap-admin] Administrator created.");
	} finally {
		await pool.end();
	}
}

bootstrapAdmin().catch((error) => {
	console.error("[bootstrap-admin] ERROR:", error.message);
	process.exitCode = 1;
});
