import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
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

    // Akses catatan rahasia hanya untuk Superadmin, Admin, Kepala Sekolah, dan Guru BK (termasuk multi-role dewan guru)
    const { allRoles } = await getUserFullRoles(session.user.id);
    const canViewConfidential = allRoles.some((r) =>
      ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH", "GURU_BK"].includes(r)
    );

    const profile = await getStudentCounselingProfile(id, canViewConfidential);
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
