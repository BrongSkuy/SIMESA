import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, spkScores, spkCriteria, classes, subjects, spkGradingCategories, academicYears } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  buildStyledWorkbookBuffer,
  attendanceStatusCellStyle,
  podiumRowStyle,
  scoreCellStyle,
  statusBadgeCellStyle,
  type StyledSheetConfig,
  type StyledColumnDef,
  type ExcelCellValue,
} from "@/lib/excel-styled";
import { calculateSPK } from "@/lib/spk";
import { getTodayWIB } from "@/lib/utils";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/system/export-all — Export all operational data as a multi-sheet Excel file
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch all data
    const allStudents = await db.select().from(students);
    const allTeachers = await db.select().from(teachers);
    const allClasses = await db.select().from(classes);
    const allSubjects = await db.select().from(subjects);
    const allAttendance = await db.select().from(attendance);
    const allScores = await db.select().from(spkScores);
    const allCriteria = await db.select().from(spkCriteria);
    const allGradingCats = await db.select().from(spkGradingCategories);
    const allAcademicYears = await db.select().from(academicYears);

    const sheets: StyledSheetConfig[] = [];
    const backupDate = getTodayWIB();
    const pushTableSheet = (
      name: string,
      title: string,
      columns: StyledColumnDef[],
      rows: Array<Record<string, ExcelCellValue>>,
      options?: Pick<StyledSheetConfig, "theme" | "rowStyle" | "landscape">
    ) => {
      sheets.push({
        name,
        title,
        theme: options?.theme ?? "obsidian",
        landscape: options?.landscape ?? columns.length > 5,
        metadata: [
          { label: "Tanggal Backup", value: backupDate },
          { label: "Jumlah Baris", value: `${rows.length} Data` },
        ],
        columns,
        rows,
        rowStyle: options?.rowStyle,
      });
    };

    // Pre-create Maps to optimize lookups to O(1)
    const studentMap = new Map(allStudents.map(s => [s.id, s]));
    const teacherMap = new Map(allTeachers.map(t => [t.id, t]));
    const criteriaMap = new Map(allCriteria.map(c => [c.id, c]));

    // Group teacher subjects by teacherId
    const teacherSubjsMap = new Map<string, string[]>();
    for (const ts of allSubjects) {
      if (!ts.teacherId) continue;
      let subjs = teacherSubjsMap.get(ts.teacherId);
      if (!subjs) {
        subjs = [];
        teacherSubjsMap.set(ts.teacherId, subjs);
      }
      subjs.push(ts.namaMapel);
    }

    // Map of mapel to classes where attendance has been taken
    const mapelClassesMap = new Map<string, Set<string>>();
    for (const att of allAttendance) {
      if (att.mapel) {
        const student = studentMap.get(att.studentId);
        if (student?.kelas) {
          let set = mapelClassesMap.get(att.mapel);
          if (!set) {
            set = new Set();
            mapelClassesMap.set(att.mapel, set);
          }
          set.add(student.kelas);
        }
      }
    }

    // Sheet 1: Siswa
    const siswaData = allStudents.map(s => ({
      ID: s.id,
      NIS: s.nis,
      NamaLengkap: s.namaLengkap,
      Kelas: s.kelas,
      Angkatan: s.angkatan,
      JenisKelamin: s.jenisKelamin,
      Status: s.status,
    }));
    pushTableSheet(
      "Data Siswa",
      "Cadangan Data Siswa",
      [
        { key: "ID", header: "ID", minWidth: 16, align: "left" },
        { key: "NIS", header: "NIS", minWidth: 14, align: "center", numFmt: "@" },
        { key: "NamaLengkap", header: "Nama Lengkap", minWidth: 26, align: "left" },
        { key: "Kelas", header: "Kelas", width: 12, align: "center" },
        { key: "Angkatan", header: "Angkatan", width: 12, align: "center", numFmt: "@" },
        { key: "JenisKelamin", header: "Jenis Kelamin", width: 14, align: "center" },
        { key: "Status", header: "Status", width: 13, align: "center", semanticStyle: statusBadgeCellStyle },
      ],
      siswaData
    );

    // Sheet 2: Guru
    const guruData = allTeachers.map(t => ({
      ID: t.id,
      NIP: t.nip,
      NamaLengkap: t.namaLengkap,
      Status: t.status,
    }));
    pushTableSheet(
      "Data Guru",
      "Cadangan Data Guru",
      [
        { key: "ID", header: "ID", minWidth: 16, align: "left" },
        { key: "NIP", header: "NIP", minWidth: 18, align: "center", numFmt: "@" },
        { key: "NamaLengkap", header: "Nama Lengkap", minWidth: 28, align: "left" },
        { key: "Status", header: "Status", width: 13, align: "center", semanticStyle: statusBadgeCellStyle },
      ],
      guruData
    );

    // Sheet 3: Kelas
    const kelasData = allClasses.map(c => ({
      ID: c.id,
      NamaKelas: c.namaKelas,
      Tingkat: c.tingkat,
      WaliKelas: c.waliKelas || "",
    }));
    pushTableSheet(
      "Data Kelas",
      "Cadangan Data Kelas",
      [
        { key: "ID", header: "ID", minWidth: 16, align: "left" },
        { key: "NamaKelas", header: "Nama Kelas", width: 16, align: "center" },
        { key: "Tingkat", header: "Tingkat", width: 12, align: "center" },
        { key: "WaliKelas", header: "Wali Kelas", minWidth: 26, align: "left" },
      ],
      kelasData
    );

    // Sheet 4: Mapel
    const mapelData = allSubjects.map(s => {
      const teacher = s.teacherId ? teacherMap.get(s.teacherId) : null;
      return {
        ID: s.id,
        NamaMapel: s.namaMapel,
        GuruPengampu: teacher ? teacher.namaLengkap : "",
        KelasDiampu: s.kelasDiampu || "",
      };
    });
    pushTableSheet(
      "Data Mapel",
      "Cadangan Data Mata Pelajaran",
      [
        { key: "ID", header: "ID", minWidth: 16, align: "left" },
        { key: "NamaMapel", header: "Nama Mapel", minWidth: 24, align: "left" },
        { key: "GuruPengampu", header: "Guru Pengampu", minWidth: 26, align: "left" },
        { key: "KelasDiampu", header: "Kelas Diampu", minWidth: 22, align: "left", wrapText: true },
      ],
      mapelData
    );

    // Sheet 5: Absensi
    const absensiData = allAttendance.map(a => {
      const student = studentMap.get(a.studentId);
      return {
        Tanggal: a.tanggal,
        NIS: student?.nis || a.studentId,
        NamaSiswa: student?.namaLengkap || "-",
        Mapel: a.mapel || "Umum",
        Status: a.status,
        Periode: a.periode,
      };
    });
    pushTableSheet(
      "Data Absensi",
      "Cadangan Data Presensi",
      [
        { key: "Tanggal", header: "Tanggal", width: 14, align: "center" },
        { key: "NIS", header: "NIS", minWidth: 14, align: "center", numFmt: "@" },
        { key: "NamaSiswa", header: "Nama Siswa", minWidth: 26, align: "left" },
        { key: "Mapel", header: "Mata Pelajaran", minWidth: 20, align: "left" },
        { key: "Status", header: "Status", width: 13, align: "center", semanticStyle: attendanceStatusCellStyle },
        { key: "Periode", header: "Periode", width: 18, align: "center" },
      ],
      absensiData
    );

    // Sheet 6: Nilai SPK
    const nilaiData = allScores.map(sc => {
      const student = studentMap.get(sc.studentId);
      const crit = criteriaMap.get(sc.criteriaId);
      return {
        NIS: student?.nis || sc.studentId,
        NamaSiswa: student?.namaLengkap || "-",
        Kriteria: crit?.namaKriteria || sc.criteriaId,
        Mapel: sc.mapel || "Umum",
        Nilai: sc.nilai,
        Details: sc.details || "",
        Periode: sc.periode,
      };
    });
    pushTableSheet(
      "Data Nilai",
      "Cadangan Data Penilaian SPK",
      [
        { key: "NIS", header: "NIS", minWidth: 14, align: "center", numFmt: "@" },
        { key: "NamaSiswa", header: "Nama Siswa", minWidth: 26, align: "left" },
        { key: "Kriteria", header: "Kriteria", minWidth: 18, align: "left" },
        { key: "Mapel", header: "Mata Pelajaran", minWidth: 20, align: "left" },
        { key: "Nilai", header: "Nilai", width: 12, align: "center", semanticStyle: scoreCellStyle },
        { key: "Details", header: "Rincian", minWidth: 24, maxWidth: 40, align: "left", wrapText: true },
        { key: "Periode", header: "Periode", width: 18, align: "center" },
      ],
      nilaiData
    );

    // Sheet 7: Kriteria SPK
    const criteriaData = allCriteria.map(c => ({
      ID: c.id,
      NamaKriteria: c.namaKriteria,
      Bobot: c.bobot,
      Tipe: c.tipe,
      Deskripsi: c.deskripsi || "",
    }));
    pushTableSheet(
      "Kriteria SPK",
      "Cadangan Kriteria SPK SAW",
      [
        { key: "ID", header: "ID", minWidth: 16, align: "left" },
        { key: "NamaKriteria", header: "Nama Kriteria", minWidth: 24, align: "left" },
        { key: "Bobot", header: "Bobot (%)", width: 12, align: "center" },
        { key: "Tipe", header: "Tipe", width: 14, align: "center" },
        { key: "Deskripsi", header: "Deskripsi", minWidth: 30, align: "left", wrapText: true },
      ],
      criteriaData
    );

    // Sheet 7b: Kategori Penilaian & Periode Akademik
    const gradingCatsData = allGradingCats.map(gc => ({
      Kelas: gc.kelas,
      Mapel: gc.mapel,
      Kriteria: criteriaMap.get(gc.criteriaId)?.namaKriteria || gc.criteriaId,
      Kategori: gc.categories,
      Periode: gc.periode,
    }));
    pushTableSheet(
      "Kategori Penilaian",
      "Cadangan Kategori Penilaian",
      [
        { key: "Kelas", header: "Kelas", width: 12, align: "center" },
        { key: "Mapel", header: "Mata Pelajaran", minWidth: 20, align: "left" },
        { key: "Kriteria", header: "Kriteria", minWidth: 18, align: "left" },
        { key: "Kategori", header: "Daftar Kategori", minWidth: 26, align: "left", wrapText: true },
        { key: "Periode", header: "Periode", width: 18, align: "center" },
      ],
      gradingCatsData
    );

    const academicYearsData = allAcademicYears.map(ay => ({
      TahunAjaran: ay.tahunAjaran,
      Semester: ay.semester,
      Status: ay.isActive ? "Aktif" : "Arsip",
    }));
    pushTableSheet(
      "Periode Akademik",
      "Cadangan Periode Tahun Ajaran",
      [
        { key: "TahunAjaran", header: "Tahun Ajaran", width: 18, align: "center" },
        { key: "Semester", header: "Semester", width: 14, align: "center" },
        { key: "Status", header: "Status", width: 14, align: "center", semanticStyle: statusBadgeCellStyle },
      ],
      academicYearsData
    );

    // Sheet 8: Penugasan Guru-Kelas (derived from waliKelas + attendance-based assignments)
    const guruKelasRows: { NIP: string; NamaGuru: string; Kelas: string; Peran: string }[] = [];

    // 1) From waliKelas assignments in classes table
    for (const cls of allClasses) {
      if (cls.waliKelas) {
        const teacher = allTeachers.find(t => t.namaLengkap === cls.waliKelas);
        guruKelasRows.push({
          NIP: teacher?.nip || "-",
          NamaGuru: cls.waliKelas,
          Kelas: cls.namaKelas,
          Peran: "Wali Kelas",
        });
      }
    }

    // 2) From subjects table
    for (const teacher of allTeachers) {
      const mySubjects = allSubjects.filter(s => s.teacherId === teacher.id);
      const classesFromSubjects = new Set<string>();
      
      for (const s of mySubjects) {
         if (s.kelasDiampu) {
            s.kelasDiampu.split(",").forEach(k => {
               if (k.trim()) classesFromSubjects.add(k.trim());
            });
         }
      }

      for (const kelasName of classesFromSubjects) {
        // Avoid duplicate if already added as waliKelas
        const alreadyAdded = guruKelasRows.some(
          r => r.NamaGuru === teacher.namaLengkap && r.Kelas === kelasName
        );
        if (!alreadyAdded) {
          guruKelasRows.push({
            NIP: teacher.nip,
            NamaGuru: teacher.namaLengkap,
            Kelas: kelasName,
            Peran: "Guru Mapel",
          });
        }
      }
    }

    // Sheet 8b: Guru-Mapel
    const tSubjData = allSubjects.filter(s => s.teacherId).map(ts => {
      const teacher = teacherMap.get(ts.teacherId!);
      return { NIP: teacher?.nip || ts.teacherId, NamaGuru: teacher?.namaLengkap || "-", Mapel: ts.namaMapel, KelasDiampu: ts.kelasDiampu || "-" };
    });
    pushTableSheet(
      "Guru-Kelas",
      "Cadangan Penugasan Guru-Kelas",
      [
        { key: "NIP", header: "NIP", minWidth: 16, align: "center", numFmt: "@" },
        { key: "NamaGuru", header: "Nama Guru", minWidth: 26, align: "left" },
        { key: "Kelas", header: "Kelas", width: 12, align: "center" },
        { key: "Peran", header: "Peran", width: 16, align: "center" },
      ],
      guruKelasRows
    );
    pushTableSheet(
      "Guru-Mapel",
      "Cadangan Penugasan Guru-Mapel",
      [
        { key: "NIP", header: "NIP", minWidth: 16, align: "center", numFmt: "@" },
        { key: "NamaGuru", header: "Nama Guru", minWidth: 26, align: "left" },
        { key: "Mapel", header: "Mata Pelajaran", minWidth: 22, align: "left" },
        { key: "KelasDiampu", header: "Kelas Diampu", minWidth: 22, align: "left", wrapText: true },
      ],
      tSubjData
    );

    // Sheet 9: Leaderboard SPK (Umum)
    const spkLeaderboard = await calculateSPK("umum");
    const leaderboardData = spkLeaderboard.map(d => ({
      Rank: d.rank,
      NIS: d.nis,
      NamaSiswa: d.namaLengkap,
      Kelas: d.kelas,
      Skor_SPK: Number(d.rawScore.toFixed(4)),
      Persentase: d.persentase + "%",
    }));
    pushTableSheet(
      "Leaderboard Umum",
      "Leaderboard SPK SAW (Umum)",
      [
        { key: "Rank", header: "Peringkat", width: 12, align: "center" },
        { key: "NIS", header: "NIS", minWidth: 14, align: "center", numFmt: "@" },
        { key: "NamaSiswa", header: "Nama Siswa", minWidth: 28, align: "left" },
        { key: "Kelas", header: "Kelas", width: 12, align: "center" },
        { key: "Skor_SPK", header: "Skor SPK", width: 14, align: "center", numFmt: "0.0000" },
        { key: "Persentase", header: "Persentase (%)", width: 16, align: "center", semanticStyle: scoreCellStyle },
      ],
      leaderboardData,
      { theme: "royal", rowStyle: (row) => podiumRowStyle(row.Rank) }
    );

    // Leaderboards for each class
    for (const c of allClasses) {
      const classStudents = spkLeaderboard.filter(d => d.kelas === c.namaKelas);
      const sortedClass = classStudents.sort((a, b) => b.rawScore - a.rawScore || a.namaLengkap.localeCompare(b.namaLengkap));
      const spkClass = sortedClass.map((s, idx) => ({ ...s, rank: idx + 1 }));

      const classData = spkClass.map(d => ({
        Rank: d.rank,
        NIS: d.nis,
        NamaSiswa: d.namaLengkap,
        Skor_SPK: Number(d.rawScore.toFixed(4)),
        Persentase: d.persentase + "%",
      }));
      const sheetName = `Leaderboard ${c.namaKelas}`.substring(0, 31);
      pushTableSheet(
        sheetName,
        `Leaderboard SPK SAW — Kelas ${c.namaKelas}`,
        [
          { key: "Rank", header: "Peringkat", width: 12, align: "center" },
          { key: "NIS", header: "NIS", minWidth: 14, align: "center", numFmt: "@" },
          { key: "NamaSiswa", header: "Nama Siswa", minWidth: 28, align: "left" },
          { key: "Skor_SPK", header: "Skor SPK", width: 14, align: "center", numFmt: "0.0000" },
          { key: "Persentase", header: "Persentase (%)", width: 16, align: "center", semanticStyle: scoreCellStyle },
        ],
        classData,
        { theme: "royal", rowStyle: (row) => podiumRowStyle(row.Rank) }
      );
    }

    // Generate styled workbook buffer
    const arrayBuf = await buildStyledWorkbookBuffer(sheets);
    const buf = Buffer.from(arrayBuf);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Export_Seluruh_Data_${getTodayWIB()}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal export data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
