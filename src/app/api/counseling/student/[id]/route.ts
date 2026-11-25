import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { getPortalForRole } from "@/lib/rbac";
import { getUserFullRoles } from "@/lib/rbac-server";
import { getStudentCounselingProfile } from "@/lib/counseling-server";

// GET /api/counseling/student/[id] — Mengambil profil pembinaan konseling terpadu per siswa
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const username = (session.user as Record<string, unknown>)?.username as string | undefined;
    const portal = getPortalForRole(appRole || "");

    if (id !== "me" && portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let targetStudentId = id;
    if (id === "me") {
      const conditions = [eq(students.userId, session.user.id)];
      if (username) {
        conditions.push(eq(students.nis, username));
      }
      const [student] = await db
        .select({ id: students.id })
        .from(students)
        .where(conditions.length > 1 ? or(...conditions) : conditions[0])
        .limit(1);

      if (!student) {
        return NextResponse.json(
          { error: "Profil data siswa tidak ditemukan untuk akun ini" },
          { status: 404 }
        );
      }
      targetStudentId = student.id;
    }

    // Akses catatan rahasia hanya untuk Superadmin, Admin, Kepala Sekolah, dan Guru BK (termasuk multi-role dewan guru)
    const { allRoles } = await getUserFullRoles(session.user.id);
    const canViewConfidential =
      id !== "me" &&
      allRoles.some((r) =>
        ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH", "GURU_BK"].includes(r)
      );

    const profile = await getStudentCounselingProfile(targetStudentId, canViewConfidential);
    if (!profile) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching student counseling profile:", error);
    return NextResponse.json(
      { error: "Gagal mengambil profil bimbingan konseling siswa" },
      { status: 500 }
    );
  }
}
