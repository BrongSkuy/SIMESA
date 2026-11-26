import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, eraporPublishClassSchema } from "@/lib/api-validation";
import { db } from "@/db";
import {
  academicYears,
  spkScores,
  studentReportNotes,
  students,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";
import { DEFAULT_PERIODE } from "@/lib/utils";
import { logActivity } from "@/lib/audit-server";
import type { EraporStatus } from "@/lib/erapor-utils";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: EraporStatus[] = ["Draf", "Disahkan", "Diterbitkan"];

// POST /api/erapor/publish-class — Ubah status penerbitan rapor satu kelas sekaligus
export async function POST(request: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as
    | string
    | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = await parseJsonBody(request, eraporPublishClassSchema);
    if (!parsed.success) return parsed.response;
    const { kelas, targetStatus } = parsed.data;
    let periode = parsed.data.periode || "";

    if (!periode) {
      const [activeYear] = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.isActive, true));
      periode = activeYear
        ? `${activeYear.tahunAjaran}-${activeYear.semester}`
        : DEFAULT_PERIODE;
    }

    const activeStudents = await db
      .select({ id: students.id, namaLengkap: students.namaLengkap })
      .from(students)
      .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
      .all();

    if (activeStudents.length === 0) {
      return NextResponse.json(
        { error: `Tidak ada siswa aktif di Kelas ${kelas}` },
        { status: 404 }
      );
    }

    const studentIds = activeStudents.map((s) => s.id);

    const [existingNotes, classScores] = await Promise.all([
      db
        .select()
        .from(studentReportNotes)
        .where(
          and(
            inArray(studentReportNotes.studentId, studentIds),
            eq(studentReportNotes.periode, periode)
          )
        )
        .all(),
      db
        .select({ studentId: spkScores.studentId, mapel: spkScores.mapel })
        .from(spkScores)
        .where(
          and(
            inArray(spkScores.studentId, studentIds),
            eq(spkScores.periode, periode)
          )
        )
        .all(),
    ]);

    const studentsWithScores = new Set<string>();
    classScores.forEach((sc) => {
      if (sc.mapel && sc.mapel !== "Umum") {
        studentsWithScores.add(sc.studentId);
      }
    });

    const existingNoteByStudent = new Map(
      existingNotes.map((n) => [n.studentId, n])
    );

    const now = new Date().toISOString();
    let updatedCount = 0;
    let skippedNoScoreCount = 0;

    for (const s of activeStudents) {
      if (targetStatus === "Diterbitkan" && !studentsWithScores.has(s.id)) {
        skippedNoScoreCount += 1;
        continue;
      }

      const existing = existingNoteByStudent.get(s.id);
      if (existing) {
        await db
          .update(studentReportNotes)
          .set({
            statusRapor: targetStatus,
            updatedAt: now,
          })
          .where(eq(studentReportNotes.id, existing.id));
      } else {
        await db.insert(studentReportNotes).values({
          studentId: s.id,
          periode,
          statusRapor: targetStatus,
          updatedAt: now,
        });
      }
      updatedCount += 1;
    }

    if (targetStatus === "Diterbitkan" && updatedCount === 0) {
      return NextResponse.json(
        {
          error: `Belum ada siswa di Kelas ${kelas} yang memiliki nilai mata pelajaran untuk diterbitkan.`,
        },
        { status: 400 }
      );
    }

    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Wali Kelas",
      userRole: appRole || "guru",
      action: "UPDATE",
      module: "E_RAPOR",
      targetId: kelas,
      targetName: `Kelas ${kelas}`,
      description: `Mengubah status E-Rapor Kelas ${kelas} menjadi ${targetStatus} (${updatedCount} siswa diperbarui${skippedNoScoreCount > 0 ? `, ${skippedNoScoreCount} siswa dilewati karena belum ada nilai` : ""})`,
      details: {
        kelas,
        periode,
        targetStatus,
        updatedCount,
        skippedNoScoreCount,
      },
      ipAddress,
    });

    const message =
      targetStatus === "Diterbitkan"
        ? skippedNoScoreCount > 0
          ? `${updatedCount} rapor Kelas ${kelas} diterbitkan (${skippedNoScoreCount} siswa dilewati karena belum ada nilai).`
          : `${updatedCount} rapor Kelas ${kelas} berhasil diterbitkan.`
        : `Status rapor ${updatedCount} siswa Kelas ${kelas} diubah menjadi ${targetStatus}.`;

    return NextResponse.json({
      success: true,
      updatedCount,
      skippedNoScoreCount,
      message,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal memperbarui status rapor kelas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
