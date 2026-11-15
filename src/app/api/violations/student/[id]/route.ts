import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getStudentDisciplinaryProfile } from "@/lib/violations";

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
    const profile = await getStudentDisciplinaryProfile(id);

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

