import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:sqlite.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runMigration() {
  console.log("Running migration for Fitur 15 (Riwayat Aktivitas & Audit Trail)...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      target_id TEXT,
      target_name TEXT,
      description TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS activity_logs_module_idx ON activity_logs(module);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);`);

  console.log("✅ activity_logs table and indexes created successfully!");
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
