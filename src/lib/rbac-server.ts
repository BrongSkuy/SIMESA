import { db } from "@/db";
import { user, userRoles } from "@/db/auth-schema";
import { classes } from "@/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import { parseRoleMetadata, type AppRole } from "@/lib/rbac";

/**
 * Mengambil daftar peran lengkap milik seorang user dari database (Server-only)
 */
export async function getUserFullRoles(userId: string): Promise<{
  primaryRole: AppRole;
  additionalRoles: AppRole[];
  allRoles: AppRole[];
}> {
  const [userRecord] = await db
    .select({ appRole: user.appRole })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const primaryRole = (userRecord?.appRole?.toUpperCase() as AppRole) || "SISWA";

  const additionalRows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  const additionalRoles = additionalRows.map(
    (row) => row.role.toUpperCase() as AppRole
  );

  const allRolesSet = new Set<AppRole>([primaryRole, ...additionalRoles]);
  const allRoles = Array.from(allRolesSet);

  return { primaryRole, additionalRoles, allRoles };
}

/**
 * Ekstrak alamat IP klien dari header HTTP (Server-only)
 */
export function getRequestIp(reqHeaders: Headers): string {
  return (
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    reqHeaders.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Menyinkronkan nama wali kelas di tabel classes serta mencegah duplikasi
 * wali kelas di user_roles untuk kelas yang sama saat peran WALI_KELAS diubah
 */
export async function syncWaliKelasAssignment(
  executor: Pick<typeof db, "select" | "update" | "delete">,
  params: {
    userId?: string;
    teacherName: string;
    previousNames?: string[];
    oldKelas?: string | null;
    newKelas?: string | null;
  }
): Promise<void> {
  const { userId, teacherName, previousNames = [], oldKelas, newKelas } = params;
  const namesToClear = Array.from(
    new Set([teacherName, ...previousNames].filter(Boolean))
  );

  if (oldKelas && oldKelas !== newKelas && namesToClear.length > 0) {
    await executor
      .update(classes)
      .set({ waliKelas: null })
      .where(
        and(
          eq(classes.namaKelas, oldKelas),
          inArray(classes.waliKelas, namesToClear)
        )
      )
      .run();
  }

  if (newKelas) {
    await executor
      .update(classes)
      .set({ waliKelas: teacherName })
      .where(eq(classes.namaKelas, newKelas))
      .run();

    // Hapus penugasan WALI_KELAS lama pada kelas ini dari guru lain agar tidak ganda
    const waliCond = userId
      ? and(eq(userRoles.role, "WALI_KELAS"), ne(userRoles.userId, userId))
      : eq(userRoles.role, "WALI_KELAS");

    const otherWaliRows = await executor
      .select({ id: userRoles.id, metadata: userRoles.metadata })
      .from(userRoles)
      .where(waliCond)
      .all();

    const conflictingIds = otherWaliRows
      .filter((row) => parseRoleMetadata(row.metadata).kelas === newKelas)
      .map((row) => row.id);

    if (conflictingIds.length > 0) {
      await executor
        .delete(userRoles)
        .where(inArray(userRoles.id, conflictingIds))
        .run();
    }
  }
}

