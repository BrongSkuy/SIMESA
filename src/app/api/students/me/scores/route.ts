import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, studentReportNotes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildStudentScoreTranscript } from "@/lib/spk";
import { canStudentPrintErapor, type EraporStatus } from "@/lib/erapor-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/students/me/scores — get the logged-in student's detailed scores & per-subject transcript
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "SISWA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find student profile
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, session.user.id));

  if (!student) {
    return NextResponse.json(
      { error: "Profil siswa tidak ditemukan" },
      { status: 404 }
    );
  }

  try {
    const transcript = await buildStudentScoreTranscript(student);

    let statusRapor: EraporStatus = "Draf";
    let eraporUpdatedAt: string | null = null;
    if (transcript.periode) {
      const [note] = await db
        .select({
          statusRapor: studentReportNotes.statusRapor,
          updatedAt: studentReportNotes.updatedAt,
        })
        .from(studentReportNotes)
        .where(
          and(
            eq(studentReportNotes.studentId, student.id),
            eq(studentReportNotes.periode, transcript.periode)
          )
        )
        .limit(1);

      if (note?.statusRapor) {
        statusRapor = note.statusRapor as EraporStatus;
        eraporUpdatedAt = note.updatedAt || null;
      }
    }

    return NextResponse.json({
      ...transcript,
      erapor: {
        statusRapor,
        canPrint: canStudentPrintErapor(statusRapor),
        updatedAt: eraporUpdatedAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat nilai siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
