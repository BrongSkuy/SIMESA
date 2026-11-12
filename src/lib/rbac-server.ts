import { db } from "@/db";
import { user, userRoles } from "@/db/auth-schema";
import { eq } from "drizzle-orm";
import type { AppRole } from "@/lib/rbac";

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

