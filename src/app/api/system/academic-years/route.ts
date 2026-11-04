import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

function validateTahunAjaranFormat(tahunAjaran: string): string | null {
  const match = /^(\d{4})\/(\d{4})$/.exec(tahunAjaran.trim());
  if (!match) {
    return "Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)";
  }
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) {
    return `Tahun ajaran harus berurutan 1 tahun (contoh: ${startYear}/${startYear + 1})`;
  }
  return null;
}

// GET /api/system/academic-years — Get all academic years
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const list = await db.select().from(academicYears).all();
    // Sort logically by tahunAjaran descending, then semester descending (Genap before Ganjil if same year)
    const sortedList = list.sort((a, b) => {
      if (a.tahunAjaran !== b.tahunAjaran) {
        return b.tahunAjaran.localeCompare(a.tahunAjaran);
      }
      return b.semester.localeCompare(a.semester);
    });
    return NextResponse.json(sortedList);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/system/academic-years — Create new academic year
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tahunAjaran, semester, isActive } = body;

    if (!tahunAjaran || !semester) {
      return NextResponse.json({ error: "Tahun ajaran dan semester wajib diisi" }, { status: 400 });
    }

    const formatErr = validateTahunAjaranFormat(String(tahunAjaran));
    if (formatErr) {
      return NextResponse.json({ error: formatErr }, { status: 400 });
    }

    // Check if duplicate exists
    const existing = await db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.tahunAjaran, tahunAjaran.trim()),
          eq(academicYears.semester, semester)
        )
      )
      .all();

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Periode tahun ajaran dan semester tersebut sudah terdaftar" },
        { status: 400 }
      );
    }

    const allYears = await db.select().from(academicYears).all();
    const hasAnyActive = allYears.some((y) => y.isActive);
    const shouldBeActive = Boolean(isActive) || !hasAnyActive;

    // If setting active, first set all others to false
    if (shouldBeActive) {
      await db.update(academicYears).set({ isActive: false }).run();
    }

    const [inserted] = await db
      .insert(academicYears)
      .values({
        tahunAjaran: tahunAjaran.trim(),
        semester,
        isActive: shouldBeActive,
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/system/academic-years — Update/Toggle active academic year or update fields
export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, tahunAjaran, semester, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const allYears = await db.select().from(academicYears).all();
    const current = allYears.find((y) => y.id === id);
    if (!current) {
      return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    const nextTahunAjaran =
      tahunAjaran !== undefined ? String(tahunAjaran).trim() : current.tahunAjaran;
    const nextSemester = semester !== undefined ? semester : current.semester;

    const formatErr = validateTahunAjaranFormat(nextTahunAjaran);
    if (formatErr) {
      return NextResponse.json({ error: formatErr }, { status: 400 });
    }

    // Check duplicate against other rows
    const duplicate = allYears.find(
      (y) =>
        y.id !== id &&
        y.tahunAjaran === nextTahunAjaran &&
        y.semester === nextSemester
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Periode tahun ajaran dan semester tersebut sudah terdaftar" },
        { status: 400 }
      );
    }

    // Prevent deactivating the sole active period
    if (isActive === false && current.isActive) {
      const otherActive = allYears.some((y) => y.id !== id && y.isActive);
      if (!otherActive) {
        return NextResponse.json(
          {
            error:
              "Tidak dapat menonaktifkan satu-satunya periode yang sedang aktif. Aktifkan periode lain terlebih dahulu.",
          },
          { status: 400 }
        );
      }
    }

    // If making this one active, set all others to inactive
    if (isActive) {
      await db.update(academicYears).set({ isActive: false }).run();
    }

    const updatePayload: Record<string, unknown> = {};
    if (tahunAjaran !== undefined) updatePayload.tahunAjaran = nextTahunAjaran;
    if (semester !== undefined) updatePayload.semester = nextSemester;
    if (isActive !== undefined) updatePayload.isActive = Boolean(isActive);

    const [updated] = await db
      .update(academicYears)
      .set(updatePayload)
      .where(eq(academicYears.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/system/academic-years — Delete an academic year
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    // Check if the one to delete is active
    const [target] = await db.select().from(academicYears).where(eq(academicYears.id, id)).all();
    if (!target) {
      return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    if (target.isActive) {
      return NextResponse.json(
        { error: "Tahun ajaran yang sedang aktif tidak dapat dihapus" },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(academicYears)
      .where(eq(academicYears.id, id))
      .returning();

    return NextResponse.json({ success: true, deleted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
