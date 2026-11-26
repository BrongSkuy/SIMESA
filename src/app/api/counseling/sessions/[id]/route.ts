import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPortalForRole } from "@/lib/rbac";
import { getUserFullRoles } from "@/lib/rbac-server";
import { logActivity } from "@/lib/audit-server";
import {
  getCounselingSessionById,
  updateCounselingSession,
  deleteCounselingSession,
} from "@/lib/counseling-server";
import {
  parseJsonBody,
  counselingSessionPatchSchema,
} from "@/lib/api-validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const sessionData = await getCounselingSessionById(id);
    if (!sessionData) {
      return NextResponse.json({ error: "Data sesi konseling tidak ditemukan" }, { status: 404 });
    }

    if (sessionData.tingkatKerahasiaan === "Rahasia") {
      const { allRoles } = await getUserFullRoles(session.user.id);
      const canViewConfidential = allRoles.some((r) =>
        ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH", "GURU_BK"].includes(r)
      );
      if (!canViewConfidential) {
        return NextResponse.json(
          { error: "Akses ditolak untuk catatan konseling bersifat rahasia" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error("Error fetching counseling session:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi konseling" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = await parseJsonBody(req, counselingSessionPatchSchema);
    if (!parsed.success) return parsed.response;

    const updated = await updateCounselingSession(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Data sesi konseling tidak ditemukan" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Guru BK",
      userRole: appRole || "guru_bk",
      action: "UPDATE",
      module: "KONSELING_BK",
      targetId: updated.studentId,
      targetName: "Sesi Konseling",
      description: `Memperbarui status sesi konseling menjadi ${updated.statusKasus}`,
      details: { sessionId: id, statusKasus: updated.statusKasus },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating counseling session:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data sesi konseling" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getCounselingSessionById(id);
    await deleteCounselingSession(id);

    if (existing) {
      await logActivity({
        userId: session.user.id,
        userName: session.user.name || "Guru BK",
        userRole: appRole || "guru_bk",
        action: "DELETE",
        module: "KONSELING_BK",
        targetId: existing.studentId,
        targetName: existing.studentName || "Siswa",
        description: `Menghapus catatan sesi konseling siswa ${existing.studentName || "Siswa"}`,
        details: { sessionId: id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting counseling session:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data sesi konseling" },
      { status: 500 }
    );
  }
}
