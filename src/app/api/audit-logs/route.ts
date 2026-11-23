import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFullRoles } from "@/lib/rbac-server";
import { getActivityLogs, logActivity, purgeOldAuditLogs } from "@/lib/audit-server";
import { AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

// GET /api/audit-logs — Mengambil daftar log aktivitas dengan filter dan paginasi
// Hak akses terbatas khusus untuk: SUPERADMIN, ADMIN, dan KEPALA_SEKOLAH
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allRoles } = await getUserFullRoles(session.user.id);
    const hasAccess = allRoles.some((r) =>
      ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH"].includes(r)
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak. Fitur ini hanya dapat diakses oleh Superadmin, Admin, dan Kepala Sekolah.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const moduleFilter = searchParams.get("module") || undefined;
    const action = searchParams.get("action") || undefined;
    const userRole = searchParams.get("userRole") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 15;

    const result = await getActivityLogs({
      search,
      module: moduleFilter,
      action,
      userRole,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/audit-logs:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar riwayat aktivitas" },
      { status: 500 }
    );
  }
}

// POST /api/audit-logs — Mencatat log aktivitas secara manual dari client (misal: aksi cetak atau ekspor)
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, module: auditModule, targetId, targetName, description, details } = body;

    if (!action || !auditModule || !description) {
      return NextResponse.json(
        { error: "Parameter action, module, dan description wajib diisi" },
        { status: 400 }
      );
    }

    if (!AUDIT_ACTIONS.includes(action) || !AUDIT_MODULES.includes(auditModule)) {
      return NextResponse.json(
        { error: "Nilai action atau module tidak valid" },
        { status: 400 }
      );
    }

    // Mendapatkan alamat IP dari headers
    const reqHeaders = await headers();
    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    const user = session.user as { id: string; name?: string | null; role?: string | null; appRole?: string | null };
    const logged = await logActivity({
      userId: user.id,
      userName: user.name || "Pengguna",
      userRole: user.appRole || user.role || "guru",
      action,
      module: auditModule,
      targetId,
      targetName,
      description,
      details,
      ipAddress,
    });

    return NextResponse.json({ success: true, data: logged });
  } catch (error) {
    console.error("Error in POST /api/audit-logs:", error);
    return NextResponse.json(
      { error: "Gagal mencatat riwayat aktivitas" },
      { status: 500 }
    );
  }
}

// DELETE /api/audit-logs?days=180 - Pembersihan riwayat aktivitas lama khusus SUPERADMIN
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allRoles } = await getUserFullRoles(session.user.id);
    if (!allRoles.includes("SUPERADMIN")) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak. Hanya Superadmin yang berwenang membersihkan riwayat aktivitas lama.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "180", 10);
    if (isNaN(days) || days < 30) {
      return NextResponse.json(
        { error: "Minimal usia riwayat yang dapat dibersihkan adalah 30 hari" },
        { status: 400 }
      );
    }

    const deletedCount = await purgeOldAuditLogs(days);

    // Dapatkan alamat IP
    const reqHeaders = await headers();
    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    const sessionUser = session.user as { id: string; name?: string | null; role?: string | null; appRole?: string | null };

    // Catat aksi pembersihan ini sendiri ke riwayat aktivitas
    await logActivity({
      userId: sessionUser.id,
      userName: sessionUser.name || "Super Administrator",
      userRole: sessionUser.appRole || sessionUser.role || "superadmin",
      action: "DELETE",
      module: "SISTEM",
      targetId: null,
      targetName: "Catatan Riwayat Lama",
      description: `Super Administrator membersihkan ${deletedCount} catatan riwayat aktivitas lama (lebih dari ${days} hari)`,
      details: {
        rentangHari: days,
        jumlahDihapus: deletedCount,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `${deletedCount} catatan riwayat aktivitas lama berhasil dibersihkan.`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error in DELETE /api/audit-logs:", error);
    return NextResponse.json(
      { error: "Gagal membersihkan riwayat aktivitas lama" },
      { status: 500 }
    );
  }
}
