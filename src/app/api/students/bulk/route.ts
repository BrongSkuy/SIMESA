import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

// POST /api/students/bulk — bulk import students from Excel data
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: {
      students: Array<{
        nis: string;
        namaLengkap: string;
        kelas: string;
        angkatan: string;
        jenisKelamin: string;
      }>;
    } = await request.json();

    if (!body.students?.length) {
      return NextResponse.json(
        { error: "Data siswa kosong" },
        { status: 400 }
      );
    }

    let successCount = 0;
    const errors: string[] = [];
    const existingStudents = await db.select().from(students).all();
    const existingClasses = await db.select().from(classes).all();
    const classCanonicalMap = new Map(
      existingClasses.map((c) => [c.namaKelas.toLowerCase().trim(), c.namaKelas])
    );

    // Pre-flight check
    for (const row of body.students) {
       row.nis = String(row.nis || "").trim();
       row.namaLengkap = String(row.namaLengkap || "").trim();
       row.kelas = String(row.kelas || "").trim();
       row.angkatan = String(row.angkatan || "").trim();
       row.jenisKelamin = String(row.jenisKelamin || "").trim();

       if (!row.nis || !row.namaLengkap || !row.kelas || !row.angkatan || !row.jenisKelamin) {
          errors.push(`Baris ${row.nis || "?"}: Data tidak lengkap`);
          continue;
       }

       if (row.nis.length < 4) {
          errors.push(`Siswa ${row.namaLengkap}: NIS '${row.nis}' minimal harus 4 karakter.`);
       }

       // Validasi kelas harus sudah ada di db classes & normalisasi ke nama kelas kanonik
       const canonicalKelas = classCanonicalMap.get(row.kelas.toLowerCase());
       if (!canonicalKelas) {
          errors.push(`Siswa ${row.namaLengkap}: Kelas '${row.kelas}' tidak ditemukan di sistem. Harap tambahkan data kelas tersebut terlebih dahulu di menu Data Kelas.`);
       } else {
          row.kelas = canonicalKelas;
       }

       const jk = row.jenisKelamin.toUpperCase().startsWith("L") ? "L" : "P";
       row.jenisKelamin = jk; // normalize inline

       // Note: Removed strict name matching to allow updating student names via Excel!
    }

    // Halt if critical validation fails
    if (errors.length > 0) {
       return NextResponse.json({ error: "Validasi Gagal", details: errors }, { status: 400 });
    }

    // Process Insert or Update
    for (const row of body.students) {
      try {
        const existing = existingStudents.find(s => s.nis === row.nis);

        if (existing) {
           // Item 6: Update existing + Sync auth user table in transaction
           await db.transaction(async (tx) => {
             await tx.update(students).set({
                namaLengkap: row.namaLengkap, // Update the name!
                kelas: row.kelas,
                angkatan: row.angkatan,
                jenisKelamin: row.jenisKelamin as "L" | "P",
                status: "aktif"
             }).where(eq(students.id, existing.id));

             if (existing.userId) {
               const { user } = await import("@/db/auth-schema");
               await tx.update(user).set({
                 name: row.namaLengkap,
               }).where(eq(user.id, existing.userId));
             }
           });
        } else {
           // Item 10: Insert new with fallback cleanup
           let newUserId: string | null = null;
           try {
             const newUser = await auth.api.signUpEmail({
               body: {
                 email: `${row.nis}@siswa.sekolah.id`,
                 password: row.nis,
                 name: row.namaLengkap,
                 username: row.nis,
                 appRole: "SISWA",
               },
             });
             newUserId = newUser.user.id;
  
             await db.insert(students).values({
               userId: newUser.user.id,
               nis: row.nis,
               namaLengkap: row.namaLengkap,
               kelas: row.kelas,
               angkatan: row.angkatan,
               jenisKelamin: row.jenisKelamin as "L" | "P",
               status: "aktif",
             });
           } catch (e) {
             // Rollback: if DB insert fails, remove the ghost auth user!
             if (newUserId) {
               const { user } = await import("@/db/auth-schema");
               await db.delete(user).where(eq(user.id, newUserId)).run();
             }
             throw e;
           }
        }

        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: `Gagal memproses NIS ${row.nis}: ${msg}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      imported: successCount,
      total: body.students.length,
      errors: [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal import data siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
