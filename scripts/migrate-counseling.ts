import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:sqlite.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runMigration() {
  console.log("Running migration for Fitur 12 (Counseling BK)...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS counseling_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      counselor_id TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      waktu_mulai TEXT NOT NULL,
      waktu_selesai TEXT NOT NULL,
      kategori TEXT NOT NULL,
      jenis_layanan TEXT NOT NULL,
      tingkat_kerahasiaan TEXT NOT NULL DEFAULT 'Umum',
      pokok_masalah TEXT NOT NULL,
      pendekatan_konseling TEXT,
      hasil_konseling TEXT,
      tindak_lanjut TEXT,
      status_kasus TEXT NOT NULL DEFAULT 'Dalam Pemantauan',
      created_at INTEGER
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS counseling_sessions_student_idx ON counseling_sessions(student_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS counseling_sessions_counselor_idx ON counseling_sessions(counselor_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS counseling_sessions_tanggal_idx ON counseling_sessions(tanggal);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS counseling_sessions_status_idx ON counseling_sessions(status_kasus);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS counseling_sessions_kategori_idx ON counseling_sessions(kategori);`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS student_monitoring_logs (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      aspek_pengamatan TEXT NOT NULL,
      catatan_perkembangan TEXT NOT NULL,
      rekomendasi TEXT,
      created_at INTEGER
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS monitoring_logs_student_idx ON student_monitoring_logs(student_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS monitoring_logs_recorder_idx ON student_monitoring_logs(recorded_by);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS monitoring_logs_tanggal_idx ON student_monitoring_logs(tanggal);`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS dispensation_letters (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      nomor_surat TEXT NOT NULL UNIQUE,
      tanggal TEXT NOT NULL,
      jam_mulai TEXT NOT NULL,
      jam_selesai TEXT NOT NULL,
      keperluan TEXT NOT NULL,
      keterangan TEXT,
      diterbitkan_oleh TEXT NOT NULL,
      status_dispensasi TEXT NOT NULL DEFAULT 'Aktif',
      created_at INTEGER
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS dispensation_letters_student_idx ON dispensation_letters(student_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS dispensation_letters_nomor_idx ON dispensation_letters(nomor_surat);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS dispensation_letters_tanggal_idx ON dispensation_letters(tanggal);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS dispensation_letters_status_idx ON dispensation_letters(status_dispensasi);`);

  console.log("✅ Tables created successfully!");
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
