import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, session as sessionTable } from "@/db/auth-schema";
import { students, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isTeacherCategoryRole } from "@/lib/rbac";
import { getUserFullRoles } from "@/lib/rbac-server";
import { logActivity } from "@/lib/audit-server";

// PUT /api/auth-accounts/[id]/status — toggle status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { allRoles } = await getUserFullRoles(session.user.id);
  if (!allRoles.some((r) => r === "SUPERADMIN" || r === "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const isBanned = body.banned === true;

    if (isBanned && id === session.user.id) {
      return NextResponse.json(
        { error: "Tidak dapat menangguhkan akun Anda sendiri yang sedang digunakan login." },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // Update user banned status
      const [updated] = await tx
        .update(user)
        .set({ banned: isBanned })
        .where(eq(user.id, id))
        .returning();

      if (!updated) {
        throw new Error("USER_NOT_FOUND");
      }

      // Sync status to students/teachers table
      const appRole = (updated as Record<string, unknown>).appRole;
      const newStatus = isBanned ? "nonaktif" : "aktif";
      if (appRole === "SISWA") {
        await tx
          .update(students)
          .set({ status: newStatus })
          .where(eq(students.userId, id))
          .run();
      } else if (isTeacherCategoryRole(String(appRole || ""))) {
        await tx
          .update(teachers)
          .set({ status: newStatus })
          .where(eq(teachers.userId, id))
          .run();
      }

      // Revoke active sessions immediately when banning
      if (isBanned) {
        await tx
          .delete(sessionTable)
          .where(eq(sessionTable.userId, id))
          .run();
      }

      return updated;
    });

    // Catat ke riwayat aktivitas (audit trail)
    if (result) {
      const reqHeaders = await headers();
      const ipAddress =
        reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        reqHeaders.get("x-real-ip") ||
        "127.0.0.1";

      await logActivity({
        userId: session.user.id,
        userName: session.user.name || "Administrator",
        userRole: (session.user as any).role || (session.user as any).appRole || "admin",
        action: "UPDATE",
        module: "MANAJEMEN_PENGGUNA",
        targetId: id,
        targetName: result.name,
        description: isBanned
          ? `Menonaktifkan atau menangguhkan akun pengguna ${result.name} (${result.email || result.username})`
          : `Mengaktifkan kembali akun pengguna ${result.name} (${result.email || result.username})`,
        details: { id, isBanned },
        ipAddress,
      });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal mengupdate status akun";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
