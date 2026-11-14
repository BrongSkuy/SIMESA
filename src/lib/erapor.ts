import { db } from "@/db";
import {
  students,
  classes,
  subjects,
  teachers,
  spkScores,
  attendance,
  academicYears,
  curriculumTargets,
  studentReportNotes,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_PERIODE } from "@/lib/utils";

export const DEFAULT_KKM = 75;

export interface SubjectReportItem {
  mapel: string;
  guruPengampu: string;
  kkm: number;
  nilaiAkhir: number | null;
  predikat: "A" | "B" | "C" | "D" | "-";
  statusKetuntasan: "Tuntas" | "Belum Tuntas" | "Belum Dinilai";
  deskripsi: string;
  komponen: Record<string, number>;
}

export interface StudentReportCardData {
  student: {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas: string;
    angkatan: string;
    jenisKelamin: "L" | "P";
  };
  periode: string;
  periodeDisplay: string;
  waliKelas: {
    nama: string;
    nip: string;
  };
  kepalaSekolah: {
    nama: string;
    nip: string;
  };
  sekolah: {
    nama: string;
    npsn: string;
    alamat: string;
    telepon: string;
    email: string;
  };
  subjects: SubjectReportItem[];
  rekapNilai: {
    totalNilai: number;
    rataRata: number;
    jumlahMapel: number;
    jumlahTuntas: number;
    jumlahBelumTuntas: number;
    predikatUmum: string;
  };
  presensi: {
    sakit: number;
    izin: number;
    alfa: number;
    hadir: number;
    total: number;
    persentase: number;
  };
  ekskul: {
    nama: string;
    nilai: string;
    keterangan: string;
  };
  catatanWaliKelas: string;
  statusRapor: "Draf" | "Disahkan" | "Diterbitkan";
  updatedAt: string;
}

export interface ClassReportSummaryItem {
  studentId: string;
  nis: string;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  rataRata: number | null;
  totalNilai: number;
  jumlahMapelTerisi: number;
  totalMapel: number;
  statusKetuntasan: "Semua Tuntas" | "Perlu Perbaikan" | "Belum Lengkap";
  statusRapor: "Draf" | "Disahkan" | "Diterbitkan";
  hasCatatan: boolean;
  presensi: {
    sakit: number;
    izin: number;
    alfa: number;
    hadir: number;
  };
}

/**
 * Menghitung Predikat, Status, dan Narasi Capaian Pembelajaran Otomatis
 * Berbasis KKM dan Nilai Akhir (Bagi Rata).
 */
export function getPredikatAndDeskripsi(
  nilai: number | null,
  mapel: string,
  kkm: number = DEFAULT_KKM,
  materiTemplate?: string | null
): {
  predikat: "A" | "B" | "C" | "D" | "-";
  statusKetuntasan: "Tuntas" | "Belum Tuntas" | "Belum Dinilai";
  deskripsi: string;
  kategori: string;
} {
  if (nilai === null || !Number.isFinite(nilai)) {
    return {
      predikat: "-",
      statusKetuntasan: "Belum Dinilai",
      deskripsi: `Penilaian mata pelajaran ${mapel} belum tuntas diinput oleh guru pengampu.`,
      kategori: "Belum Dinilai",
    };
  }

  const rounded = Number(nilai.toFixed(2));
  const materi = materiTemplate
    ? materiTemplate.trim()
    : `capaian pembelajaran ${mapel}`;

  if (rounded >= 90) {
    return {
      predikat: "A",
      statusKetuntasan: "Tuntas",
      deskripsi: `Menunjukkan penguasaan yang sangat unggul dalam memahami seluruh materi ${materi} dengan kedisiplinan dan keterampilan yang amat baik.`,
      kategori: "Sangat Baik",
    };
  }

  if (rounded >= 80) {
    return {
      predikat: "B",
      statusKetuntasan: "Tuntas",
      deskripsi: `Menunjukkan penguasaan yang baik dan tuntas dalam memahami sebagian besar materi ${materi}.`,
      kategori: "Baik",
    };
  }

  if (rounded >= kkm) {
    return {
      predikat: "C",
      statusKetuntasan: "Tuntas",
      deskripsi: `Menunjukkan pemahaman yang cukup dan telah memenuhi kriteria ketuntasan minimal pada materi ${materi}.`,
      kategori: "Cukup",
    };
  }

  return {
    predikat: "D",
    statusKetuntasan: "Belum Tuntas",
    deskripsi: `Perlu pendampingan dan bimbingan belajar tambahan untuk meningkatkan penguasaan materi pada ${materi}.`,
    kategori: "Perlu Bimbingan",
  };
}

/**
 * Mengambil data terpadu E-Rapor Internal seorang siswa untuk dicetak/dilihat.
 */
export async function getStudentReportCard(
  studentId: string,
  targetPeriode?: string
): Promise<StudentReportCardData | null> {
  // 1. Ambil data siswa
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) return null;

  // 2. Tentukan periode aktif
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    activePeriode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
  }
  const periodeDisplay = activePeriode.replace("-", " Semester ");

  // 3. Ambil data pendukung secara paralel
  const [
    allClasses,
    allTeachers,
    allSubjects,
    scoresRows,
    attendanceRows,
    curriculumRows,
    reportNotesRows,
  ] = await Promise.all([
    db.select().from(classes).where(eq(classes.namaKelas, student.kelas)),
    db.select().from(teachers).all(),
    db.select().from(subjects).all(),
    db
      .select()
      .from(spkScores)
      .where(
        and(
          eq(spkScores.studentId, student.id),
          eq(spkScores.periode, activePeriode)
        )
      )
      .all(),
    db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, student.id),
          eq(attendance.periode, activePeriode)
        )
      )
      .all(),
    db.select().from(curriculumTargets).all(),
    db
      .select()
      .from(studentReportNotes)
      .where(
        and(
          eq(studentReportNotes.studentId, student.id),
          eq(studentReportNotes.periode, activePeriode)
        )
      )
      .all(),
  ]);

  // Map Wali Kelas & Kepala Sekolah
  const kelasRow = allClasses[0];
  const waliKelasNama = kelasRow?.waliKelas || "Wali Kelas";
  const matchedWaliTeacher = allTeachers.find(
    (t) => t.namaLengkap.toLowerCase() === waliKelasNama.toLowerCase()
  );
  const waliKelasNip = matchedWaliTeacher?.nip || "-";

  // Ambil data Kepala Sekolah (jika ada guru bertitel Kepala Sekolah atau default)
  const kepalaSekolahNama = "Drs. H. Hendra Dirgantara, M.Pd.";
  const kepalaSekolahNip = "19720315 199802 1 003";

  // Identifikasi Mata Pelajaran yang diampu untuk kelas siswa
  const teacherById = new Map<string, string>();
  allTeachers.forEach((t) => teacherById.set(t.id, t.namaLengkap));

  const kkmByMapel = new Map<string, number>();
  const capaianByMapel = new Map<string, string>();
  curriculumRows.forEach((c) => {
    kkmByMapel.set(c.mapel.toLowerCase(), c.kkm);
    if (c.capaianKompetensi) {
      capaianByMapel.set(c.mapel.toLowerCase(), c.capaianKompetensi);
    }
  });

  // Map scores by mapel name
  const scoreByMapel = new Map<string, typeof scoresRows[0]>();
  scoresRows.forEach((sc) => {
    if (sc.mapel && sc.mapel !== "Umum") {
      scoreByMapel.set(sc.mapel.toLowerCase(), sc);
    }
  });

  // Susun daftar mapel unik
  const subjectItems: SubjectReportItem[] = [];
  const seenMapelNames = new Set<string>();

  for (const subj of allSubjects) {
    const assignedClasses = (subj.kelasDiampu || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (assignedClasses.includes(student.kelas) || assignedClasses.length === 0) {
      const lowerName = subj.namaMapel.trim().toLowerCase();
      if (!seenMapelNames.has(lowerName)) {
        seenMapelNames.add(lowerName);

        const scoreRow = scoreByMapel.get(lowerName);
        const kkm = kkmByMapel.get(lowerName) ?? DEFAULT_KKM;
        const materiTemplate = capaianByMapel.get(lowerName);

        let finalScore: number | null = null;
        let komponenParsed: Record<string, number> = {};

        if (scoreRow) {
          if (scoreRow.details) {
            try {
              const det = JSON.parse(scoreRow.details);
              if (det && typeof det === "object") {
                const vals = Object.values(det).map(Number).filter(Number.isFinite);
                if (vals.length > 0) {
                  // Bagi rata (mean)
                  const sum = vals.reduce((a, b) => a + b, 0);
                  finalScore = Number((sum / vals.length).toFixed(2));
                  komponenParsed = det as Record<string, number>;
                }
              }
            } catch {
              finalScore = scoreRow.nilai;
            }
          } else if (Number.isFinite(scoreRow.nilai)) {
            finalScore = scoreRow.nilai;
          }
        }

        const evaluation = getPredikatAndDeskripsi(
          finalScore,
          subj.namaMapel,
          kkm,
          materiTemplate
        );

        subjectItems.push({
          mapel: subj.namaMapel,
          guruPengampu:
            (subj.teacherId && teacherById.get(subj.teacherId)) ||
            "Guru Mata Pelajaran",
          kkm,
          nilaiAkhir: finalScore,
          predikat: evaluation.predikat,
          statusKetuntasan: evaluation.statusKetuntasan,
          deskripsi: evaluation.deskripsi,
          komponen: komponenParsed,
        });
      }
    }
  }

  // Tambahkan mapel lain jika siswa punya nilai di mapel itu namun belum terdaftar
  for (const sc of scoresRows) {
    if (!sc.mapel || sc.mapel === "Umum") continue;
    const lowerName = sc.mapel.trim().toLowerCase();
    if (!seenMapelNames.has(lowerName)) {
      seenMapelNames.add(lowerName);
      const kkm = kkmByMapel.get(lowerName) ?? DEFAULT_KKM;
      const materiTemplate = capaianByMapel.get(lowerName);
      let finalScore: number | null = sc.nilai;
      let komponenParsed: Record<string, number> = {};

      if (sc.details) {
        try {
          const det = JSON.parse(sc.details);
          if (det && typeof det === "object") {
            const vals = Object.values(det).map(Number).filter(Number.isFinite);
            if (vals.length > 0) {
              const sum = vals.reduce((a, b) => a + b, 0);
              finalScore = Number((sum / vals.length).toFixed(2));
              komponenParsed = det as Record<string, number>;
            }
          }
        } catch {
          // ignore parse error
        }
      }

      const evaluation = getPredikatAndDeskripsi(
        finalScore,
        sc.mapel,
        kkm,
        materiTemplate
      );

      subjectItems.push({
        mapel: sc.mapel,
        guruPengampu: "Guru Mata Pelajaran",
        kkm,
        nilaiAkhir: finalScore,
        predikat: evaluation.predikat,
        statusKetuntasan: evaluation.statusKetuntasan,
        deskripsi: evaluation.deskripsi,
        komponen: komponenParsed,
      });
    }
  }

  // Hitung ringkasan nilai rapor
  const scoredSubjects = subjectItems.filter((s) => s.nilaiAkhir !== null);
  const totalNilai = scoredSubjects.reduce(
    (acc, curr) => acc + (curr.nilaiAkhir || 0),
    0
  );
  const rataRata =
    scoredSubjects.length > 0
      ? Number((totalNilai / scoredSubjects.length).toFixed(2))
      : 0;
  const jumlahTuntas = subjectItems.filter(
    (s) => s.statusKetuntasan === "Tuntas"
  ).length;
  const jumlahBelumTuntas = subjectItems.filter(
    (s) => s.statusKetuntasan === "Belum Tuntas"
  ).length;

  let predikatUmum = "-";
  if (rataRata >= 90) predikatUmum = "A (Sangat Baik)";
  else if (rataRata >= 80) predikatUmum = "B (Baik)";
  else if (rataRata >= DEFAULT_KKM) predikatUmum = "C (Cukup)";
  else if (rataRata > 0) predikatUmum = "D (Perlu Bimbingan)";

  // Hitung presensi
  let sakit = 0;
  let izin = 0;
  let alfa = 0;
  let hadir = 0;

  attendanceRows.forEach((att) => {
    if (att.status === "Sakit") sakit++;
    else if (att.status === "Izin") izin++;
    else if (att.status === "Alfa") alfa++;
    else if (att.status === "Hadir") hadir++;
  });

  const totalAbsen = sakit + izin + alfa + hadir;
  const persentaseKehadiran =
    totalAbsen > 0 ? Number(((hadir / totalAbsen) * 100).toFixed(1)) : 100;

  // Catatan Wali Kelas & Ekskul
  const noteRow = reportNotesRows[0];
  const catatanWaliKelas =
    noteRow?.catatanWaliKelas?.trim() ||
    "Pertahankan kedisiplinan, motivasi belajar, dan sikap kepemimpinan yang baik sebagai taruna/taruni SMK Penerbangan Dirgantara.";
  const ekskulNama = noteRow?.ekskulNama?.trim() || "Pramuka Dirgantara";
  const ekskulNilai = noteRow?.ekskulNilai?.trim() || "Sangat Baik";
  const ekskulKeterangan =
    noteRow?.ekskulKeterangan?.trim() ||
    "Aktif mengikuti latihan rutin, upacara, dan kegiatan keorganisasian sekolah.";
  const statusRapor = (noteRow?.statusRapor as "Draf" | "Disahkan" | "Diterbitkan") || "Draf";
  const updatedAt = noteRow?.updatedAt || new Date().toISOString();

  return {
    student: {
      id: student.id,
      nis: student.nis,
      namaLengkap: student.namaLengkap,
      kelas: student.kelas,
      angkatan: student.angkatan,
      jenisKelamin: student.jenisKelamin,
    },
    periode: activePeriode,
    periodeDisplay,
    waliKelas: {
      nama: waliKelasNama,
      nip: waliKelasNip,
    },
    kepalaSekolah: {
      nama: kepalaSekolahNama,
      nip: kepalaSekolahNip,
    },
    sekolah: {
      nama: "SMK Penerbangan Dirgantara",
      npsn: "20235678",
      alamat: "Jl. Marsekal Suryadarma No. 12, Kompleks Bandara",
      telepon: "(021) 5567-8901",
      email: "info@smkpenerbangan.sch.id",
    },
    subjects: subjectItems,
    rekapNilai: {
      totalNilai: Number(totalNilai.toFixed(2)),
      rataRata,
      jumlahMapel: subjectItems.length,
      jumlahTuntas,
      jumlahBelumTuntas,
      predikatUmum,
    },
    presensi: {
      sakit,
      izin,
      alfa,
      hadir,
      total: totalAbsen,
      persentase: persentaseKehadiran,
    },
    ekskul: {
      nama: ekskulNama,
      nilai: ekskulNilai,
      keterangan: ekskulKeterangan,
    },
    catatanWaliKelas,
    statusRapor,
    updatedAt,
  };
}

/**
 * Mengambil ringkasan data E-Rapor satu kelas untuk Wali Kelas / Admin.
 */
export async function getClassReportSummary(
  kelas: string,
  targetPeriode?: string
): Promise<{
  kelas: string;
  waliKelas: string;
  periode: string;
  students: ClassReportSummaryItem[];
}> {
  // 1. Ambil data kelas
  const [kelasRow] = await db
    .select()
    .from(classes)
    .where(eq(classes.namaKelas, kelas));

  // 2. Tentukan periode
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    activePeriode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
  }

  // 3. Ambil seluruh siswa aktif di kelas
  const activeStudents = await db
    .select()
    .from(students)
    .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
    .all();

  // 4. Ambil subjek unik untuk kelas ini
  const allSubjects = await db.select().from(subjects).all();
  const seenClassMapels = new Set<string>();
  allSubjects.forEach((s) => {
    const assigned = (s.kelasDiampu || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (assigned.includes(kelas) || assigned.length === 0) {
      seenClassMapels.add(s.namaMapel.trim().toLowerCase());
    }
  });
  const totalMapel = seenClassMapels.size;

  // 5. Ambil data notes, scores, dan attendance untuk kelas ini
  const studentIds = activeStudents.map((s) => s.id);
  const [allNotes, allScores, allAttendance] = await Promise.all([
    db
      .select()
      .from(studentReportNotes)
      .where(eq(studentReportNotes.periode, activePeriode))
      .all(),
    db
      .select()
      .from(spkScores)
      .where(eq(spkScores.periode, activePeriode))
      .all(),
    db
      .select()
      .from(attendance)
      .where(eq(attendance.periode, activePeriode))
      .all(),
  ]);

  const noteByStudent = new Map<string, typeof allNotes[0]>();
  allNotes.forEach((n) => noteByStudent.set(n.studentId, n));

  const scoresByStudent = new Map<string, Array<typeof allScores[0]>>();
  allScores.forEach((sc) => {
    if (sc.mapel && sc.mapel !== "Umum") {
      let list = scoresByStudent.get(sc.studentId);
      if (!list) {
        list = [];
        scoresByStudent.set(sc.studentId, list);
      }
      list.push(sc);
    }
  });

  const attByStudent = new Map<string, Array<typeof allAttendance[0]>>();
  allAttendance.forEach((att) => {
    let list = attByStudent.get(att.studentId);
    if (!list) {
      list = [];
      attByStudent.set(att.studentId, list);
    }
    list.push(att);
  });

  const resultStudents: ClassReportSummaryItem[] = activeStudents.map((s) => {
    const studentScores = scoresByStudent.get(s.id) || [];
    const note = noteByStudent.get(s.id);
    const studentAtt = attByStudent.get(s.id) || [];

    // Kelompokkan nilai berdasarkan mapel unik untuk siswa ini (prioritas akademik)
    const mapelScoreMap = new Map<string, number>();

    studentScores.forEach((sc) => {
      if (!sc.mapel || sc.mapel === "Umum") return;
      const lowerMapel = sc.mapel.trim().toLowerCase();

      let finalVal: number | null = null;
      if (sc.details) {
        try {
          const det = JSON.parse(sc.details);
          const vals = Object.values(det).map(Number).filter(Number.isFinite);
          if (vals.length > 0) {
            finalVal = vals.reduce((a, b) => a + b, 0) / vals.length;
          }
        } catch {
          finalVal = sc.nilai;
        }
      } else if (Number.isFinite(sc.nilai)) {
        finalVal = sc.nilai;
      }

      if (finalVal !== null && Number.isFinite(finalVal)) {
        if (
          !mapelScoreMap.has(lowerMapel) ||
          (sc.details && (sc.details.includes("UTS") || sc.details.includes("Tugas")))
        ) {
          mapelScoreMap.set(lowerMapel, finalVal);
        }
      }
    });

    let totalScoreSum = 0;
    let belowKkmCount = 0;
    mapelScoreMap.forEach((val) => {
      totalScoreSum += val;
      if (val < DEFAULT_KKM) {
        belowKkmCount++;
      }
    });

    const scoredSubjectCount = mapelScoreMap.size;
    const rataRata =
      scoredSubjectCount > 0
        ? Number((totalScoreSum / scoredSubjectCount).toFixed(2))
        : null;

    let statusKetuntasan: "Semua Tuntas" | "Perlu Perbaikan" | "Belum Lengkap" =
      "Semua Tuntas";
    if (scoredSubjectCount < totalMapel && scoredSubjectCount === 0) {
      statusKetuntasan = "Belum Lengkap";
    } else if (belowKkmCount > 0) {
      statusKetuntasan = "Perlu Perbaikan";
    }

    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let hadir = 0;
    studentAtt.forEach((a) => {
      if (a.status === "Sakit") sakit++;
      else if (a.status === "Izin") izin++;
      else if (a.status === "Alfa") alfa++;
      else if (a.status === "Hadir") hadir++;
    });

    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      jenisKelamin: s.jenisKelamin,
      rataRata,
      totalNilai: Number(totalScoreSum.toFixed(2)),
      jumlahMapelTerisi: scoredSubjectCount,
      totalMapel,
      statusKetuntasan,
      statusRapor: (note?.statusRapor as "Draf" | "Disahkan" | "Diterbitkan") || "Draf",
      hasCatatan: Boolean(note?.catatanWaliKelas && note.catatanWaliKelas.trim().length > 0),
      presensi: { sakit, izin, alfa, hadir },
    };
  });

  return {
    kelas,
    waliKelas: kelasRow?.waliKelas || "Wali Kelas",
    periode: activePeriode,
    students: resultStudents,
  };
}

