import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStudentDisciplinaryProfile } from "@/lib/violations-server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/violations/student/[id] — Transkrip profil buku poin & kedisiplinan siswa
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let targetStudentId = id;

    // Jika parameter id adalah "me", cari studentId berdasarkan userId sesi login
    if (id === "me") {
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.userId, session.user.id))
        .limit(1);

      if (!student) {
        return NextResponse.json(
          { error: "Profil data taruna tidak ditemukan untuk akun ini" },
          { status: 404 }
        );
      }
      targetStudentId = student.id;
    }

    const profile = await getStudentDisciplinaryProfile(targetStudentId);

    if (!profile) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching student disciplinary profile:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data profil kedisiplinan siswa" },
      { status: 500 }
    );
  }
}

