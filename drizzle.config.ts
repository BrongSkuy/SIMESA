import { defineConfig } from "drizzle-kit";

const isTurso = Boolean(process.env.TURSO_AUTH_TOKEN);

export default defineConfig({
  out: "./drizzle",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  dialect: isTurso ? "turso" : "sqlite",
  dbCredentials: isTurso
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }
    : {
        url: (process.env.TURSO_DATABASE_URL || "sqlite.db").replace(/^file:/, ""),
      },
});

