import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  spkScores,
  students,
  academicYears,
  spkGradingCategories,
  spkPublishStatus,
} from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_PERIODE } from "@/lib/utils";
import { verifyTeacherSubjectAccess } from "@/lib/teacher-auth";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/spk/scores?kelas=..&criteriaId=..&mapel=..
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas")?.trim();
  const criteriaId = searchParams.get("criteriaId")?.trim();
  const rawMapel = searchParams.get("mapel")?.trim();

  if (!kelas || !criteriaId) {
    return NextResponse.json(
      { error: "Parameter kelas dan criteriaId wajib" },
      { status: 400 }
    );
  }

  if (portal === "/guru") {
    const authCheck = await verifyTeacherSubjectAccess(
      session.user.id,
      kelas,
      rawMapel || ""
    );
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }
  }

  const mapel = rawMapel || null;

  // Get active period
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true));
  const periode = activeYear
    ? `${activeYear.tahunAjaran}-${activeYear.semester}`
    : DEFAULT_PERIODE;

  // Get grading categories setup
  let categoryCond = and(
    eq(spkGradingCategories.kelas, kelas),
    eq(spkGradingCategories.criteriaId, criteriaId),
    eq(spkGradingCategories.periode, periode)
  );

  if (mapel && mapel !== "Umum") {
    categoryCond = and(categoryCond, eq(spkGradingCategories.mapel, mapel));
  } else {
    categoryCond = and(categoryCond, eq(spkGradingCategories.mapel, "Umum"));
  }

  const [gradingCatRecord] = await db
    .select()
    .from(spkGradingCategories)
    .where(categoryCond);
  let categories: string[] = [];
  if (gradingCatRecord?.categories) {
    try {
      const parsed = JSON.parse(gradingCatRecord.categories);
      if (Array.isArray(parsed)) categories = parsed;
    } catch {
      categories = [];
    }
  }

  // Get active students in class
  const siswaKelas = await db
    .select()
    .from(students)
    .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
    .all();
  if (siswaKelas.length === 0) {
    return NextResponse.json({
      categories,
      students: [],
    });
  }

  const studentIds = siswaKelas.map((s) => s.id);

  // Get scores
  const existingScores = await db
    .select()
    .from(spkScores)
    .where(
      and(
        eq(spkScores.criteriaId, criteriaId),
        eq(spkScores.periode, periode),
        inArray(spkScores.studentId, studentIds)
      )
    )
    .all();

  let filteredScores = existingScores;
  if (mapel && mapel !== "Umum") {
    filteredScores = existingScores.filter((s) => s.mapel === mapel);
  } else {
    filteredScores = existingScores.filter((s) => !s.mapel || s.mapel === "Umum");
  }

  const scoreByStudent = new Map<string, (typeof filteredScores)[0]>();
  filteredScores.forEach((r) => {
    scoreByStudent.set(r.studentId, r);
  });

  const result = siswaKelas.map((s) => {
    const record = scoreByStudent.get(s.id);
    let detailsObj: Record<string, number> = {};
    if (record?.details) {
      try {
        detailsObj = JSON.parse(record.details);
      } catch {
        detailsObj = {};
      }
    }
    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      nilai: record?.nilai ?? 0,
      details: detailsObj,
      scoreId: record?.id || null,
    };
  });

  return NextResponse.json({
    categories,
    students: result,
  });
}

// POST /api/spk/scores
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (!session || (portal !== "/admin" && portal !== "/guru")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: {
      kelas: string;
      criteriaId: string;
      mapel?: string;
      categories?: string[];
      records: Array<{
        studentId: string;
        details?: Record<string, number | string>;
      }>;
    } = await request.json();

    const rawMapel = body.mapel?.trim();
    const kelas = body.kelas?.trim();
    const criteriaId = body.criteriaId?.trim();

    if (!kelas || !criteriaId || !Array.isArray(body.records)) {
      return NextResponse.json(
        { error: "Data nilai tidak valid" },
        { status: 400 }
      );
    }

    // Strict Curriculum Subject & Ownership Check for GURU
    if (portal === "/guru") {
      const authCheck = await verifyTeacherSubjectAccess(
        session.user.id,
        kelas,
        rawMapel || ""
      );
      if (!authCheck.ok) {
        return NextResponse.json(
          { error: authCheck.error },
          { status: authCheck.status }
        );
      }
    }

    const mapel = rawMapel && rawMapel !== "Umum" ? rawMapel : "Umum";

    // Validate submitted studentIds belong to active students in `kelas`
    const siswaKelas = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
      .all();
    const validClassStudentIds = new Set(siswaKelas.map((s) => s.id));

    for (const rec of body.records) {
      if (!rec.studentId || !validClassStudentIds.has(rec.studentId)) {
        return NextResponse.json(
          {
            error:
              "Terdapat siswa yang bukan merupakan anggota aktif kelas terpilih.",
          },
          { status: 400 }
        );
      }
    }

    // Validate & clean score entries BEFORE entering transaction (returns 400 on invalid input)
    const activePeriodRows = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const activeYear = activePeriodRows[0];
    const periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;

    // Lockdown Check
    const [pubStatus] = await db
      .select()
      .from(spkPublishStatus)
      .where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json(
        {
          error:
            "Periode ini telah dikunci (Finalized). Data nilai tidak dapat diubah lagi.",
        },
        { status: 403 }
      );
    }

    const valuesToInsert: Array<{
      studentId: string;
      criteriaId: string;
      mapel: string | null;
      nilai: number;
      details: string;
      periode: string;
    }> = [];

    for (const record of body.records) {
      const cleanedDetails: Record<string, number> = {};
      let sum = 0;
      let count = 0;

      if (record.details && typeof record.details === "object") {
        for (const [catKey, rawVal] of Object.entries(record.details)) {
          if (rawVal === undefined || rawVal === null || rawVal === "") {
            continue;
          }
          const num = Number(rawVal);
          if (!Number.isFinite(num) || num < 0 || num > 100) {
            return NextResponse.json(
              {
                error: `Nilai tidak valid (${rawVal}). Nilai harus berada dalam rentang 0 hingga 100.`,
              },
              { status: 400 }
            );
          }
          cleanedDetails[catKey] = num;
          sum += num;
          count++;
        }
      }

      // Only persist score row if at least 1 category has a score so unfilled students remain "Belum Dinilai"
      if (count > 0) {
        valuesToInsert.push({
          studentId: record.studentId,
          criteriaId,
          mapel: mapel === "Umum" ? null : mapel,
          nilai: sum / count,
          details: JSON.stringify(cleanedDetails),
          periode,
        });
      }
    }

    const studentIds = body.records.map((r) => r.studentId);

    await db.transaction(async (tx) => {
      // Sub-transaction 1: Update Categories Configuration
      const categoryCond = and(
        eq(spkGradingCategories.kelas, kelas),
        eq(spkGradingCategories.criteriaId, criteriaId),
        eq(spkGradingCategories.mapel, mapel),
        eq(spkGradingCategories.periode, periode)
      );
      await tx.delete(spkGradingCategories).where(categoryCond);
      await tx.insert(spkGradingCategories).values({
        kelas,
        mapel,
        criteriaId,
        periode,
        categories: JSON.stringify(Array.isArray(body.categories) ? body.categories : []),
      });

      // Batch delete existing scores for these students (including cleared students)
      if (studentIds.length > 0) {
        let deleteCond = and(
          inArray(spkScores.studentId, studentIds),
          eq(spkScores.criteriaId, criteriaId),
          eq(spkScores.periode, periode)
        );

        if (mapel !== "Umum") {
          deleteCond = and(deleteCond, eq(spkScores.mapel, mapel));
        } else {
          deleteCond = and(
            deleteCond,
            sql`(${spkScores.mapel} IS NULL OR ${spkScores.mapel} = 'Umum' OR ${spkScores.mapel} = '')`
          );
        }
        await tx.delete(spkScores).where(deleteCond);
      }

      if (valuesToInsert.length > 0) {
        await tx.insert(spkScores).values(valuesToInsert);
      }
    });

    return NextResponse.json({ success: true, count: valuesToInsert.length });
  } catch (error: unknown) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan nilai";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/spk/scores
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (!session || (portal !== "/admin" && portal !== "/guru")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas")?.trim();
  const criteriaId = searchParams.get("criteriaId")?.trim();
  const rawMapel = searchParams.get("mapel")?.trim();

  if (!kelas || !criteriaId) {
    return NextResponse.json(
      { error: "Parameter wajib tidak lengkap" },
      { status: 400 }
    );
  }

  // Strict Curriculum Subject & Ownership Check for DELETE
  if (portal === "/guru") {
    const authCheck = await verifyTeacherSubjectAccess(
      session.user.id,
      kelas,
      rawMapel || ""
    );
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }
  }

  const mapel = rawMapel && rawMapel !== "Umum" ? rawMapel : null;

  try {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;

    // Lockdown Check
    const [pubStatus] = await db
      .select()
      .from(spkPublishStatus)
      .where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json(
        {
          error:
            "Periode ini telah dikunci (Finalized). Data nilai tidak dapat dihapus lagi.",
        },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
      const siswaKelas = await tx
        .select()
        .from(students)
        .where(eq(students.kelas, kelas))
        .all();
      const studentIds = siswaKelas.map((s) => s.id);

      if (studentIds.length > 0) {
        let cond = and(
          inArray(spkScores.studentId, studentIds),
          eq(spkScores.criteriaId, criteriaId),
          eq(spkScores.periode, periode)
        );

        if (mapel) {
          cond = and(cond, eq(spkScores.mapel, mapel));
        } else {
          cond = and(
            cond,
            sql`(${spkScores.mapel} IS NULL OR ${spkScores.mapel} = 'Umum' OR ${spkScores.mapel} = '')`
          );
        }

        await tx.delete(spkScores).where(cond);
      }

      // Also cleanup categories
      const catCond = and(
        eq(spkGradingCategories.kelas, kelas),
        eq(spkGradingCategories.criteriaId, criteriaId),
        eq(spkGradingCategories.mapel, mapel || "Umum"),
        eq(spkGradingCategories.periode, periode)
      );
      await tx.delete(spkGradingCategories).where(catCond);
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus nilai";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
