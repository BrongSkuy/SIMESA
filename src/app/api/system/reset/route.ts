import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  students,
  teachers,
  attendance,
  spkScores,
  spkGradingCategories,
  classes,
  subjects,
  spkResults,
  spkPublishStatus,
  leaderboardArchives,
} from "@/db/schema";
import { user, session as sessionTable, account } from "@/db/auth-schema";
import { inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

// POST /api/system/reset — Reset (delete) all operational data
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db.transaction(async (tx) => {
      // Delete in order to avoid FK issues (most dependent first)
      await tx.delete(spkResults);
      await tx.delete(spkPublishStatus);
      await tx.delete(leaderboardArchives);
      await tx.delete(spkGradingCategories);
      await tx.delete(spkScores);
      await tx.delete(attendance);
      await tx.delete(students);
      await tx.delete(teachers);
      await tx.delete(subjects);
      await tx.delete(classes);

      // Find non-admin users (SISWA & GURU) and clean up their sessions & accounts explicitly
      const nonAdminUsers = await tx
        .select({ id: user.id })
        .from(user)
        .where(inArray(user.appRole, ["SISWA", "GURU"]));
      const nonAdminIds = nonAdminUsers.map((u) => u.id);

      if (nonAdminIds.length > 0) {
        await tx
          .delete(sessionTable)
          .where(inArray(sessionTable.userId, nonAdminIds));
        await tx
          .delete(account)
          .where(inArray(account.userId, nonAdminIds));
        await tx.delete(user).where(inArray(user.id, nonAdminIds));
      }
    });

    return NextResponse.json({
      success: true,
      message:
        "Seluruh data operasional berhasil dihapus. Konfigurasi SPK dan akun administrator tetap dipertahankan.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mereset data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
