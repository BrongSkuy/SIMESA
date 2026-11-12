import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import { user, session as sessionTable } from "@/db/auth-schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "absensi_siswa_secret_key_1234567890_unpam",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  trustedOrigins: [
    "http://localhost:3000",
    "https://simesa-six.vercel.app",
    "https://absensi-siswa-smk.vercel.app",
    "https://absensi-siswa-mu.vercel.app",
    "https://absensi-siswa-git-main-brongskuys-projects.vercel.app",
    "https://absensisiswa-main-bzjg5eu66.vercel.app",
    process.env.BETTER_AUTH_URL || "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "",
  ].filter(Boolean),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4, // relaxed for NIS default passwords
  },

  plugins: [
    username({
      usernameValidator: () => true,
    }), // login via NIP/NIS as username
    admin({
      defaultRole: "user", // default role, admin sets roles via admin plugin
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (default maximum)
    updateAge: 60 * 60 * 24, // update session every 24 hours
  },

  databaseHooks: {
    session: {
      create: {
        before: async (sessionData) => {
          try {
            const [userData] = await db
              .select({ appRole: user.appRole })
              .from(user)
              .where(eq(user.id, sessionData.userId))
              .limit(1);

            const role = (userData?.appRole || "SISWA").toUpperCase();
            const isStudent = role === "SISWA";
            // Siswa & Orang Tua: 7 hari (604.800.000 ms), Admin & Guru: 24 jam (86.400.000 ms)
            const durationMs = isStudent
              ? 7 * 24 * 60 * 60 * 1000
              : 24 * 60 * 60 * 1000;

            return {
              data: {
                ...sessionData,
                expiresAt: new Date(Date.now() + durationMs),
              },
            };
          } catch {
            return;
          }
        },
      },
      update: {
        before: async (sessionData) => {
          try {
            let userId = sessionData.userId;
            if (!userId && sessionData.id) {
              const [existing] = await db
                .select({ userId: sessionTable.userId })
                .from(sessionTable)
                .where(eq(sessionTable.id, sessionData.id))
                .limit(1);
              userId = existing?.userId;
            }

            if (!userId) return;

            const [userData] = await db
              .select({ appRole: user.appRole })
              .from(user)
              .where(eq(user.id, userId))
              .limit(1);

            const role = (userData?.appRole || "SISWA").toUpperCase();
            const isStudent = role === "SISWA";
            const durationMs = isStudent
              ? 7 * 24 * 60 * 60 * 1000
              : 24 * 60 * 60 * 1000;

            return {
              data: {
                ...sessionData,
                expiresAt: new Date(Date.now() + durationMs),
              },
            };
          } catch {
            return;
          }
        },
      },
    },
  },

  user: {
    additionalFields: {
      appRole: {
        type: "string",
        required: false,
        defaultValue: "SISWA",
        input: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
