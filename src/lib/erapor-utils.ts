/**
 * Client-safe pure helpers for E-Rapor & KKM Mata Pelajaran.
 * Tidak mengimpor modul database server agar aman digunakan di Client Components.
 */

export const DEFAULT_KKM_FALLBACK = 75;
export const DEFAULT_KKM_KEY = "__DEFAULT__";

/**
 * Membersihkan input angka KKM dari karakter non-digit dan angka 0 di awal (leading zero),
 * misalnya "080" -> "80", "00" -> "0", "" -> "".
 * Mencegah bug input number yang memaksa nilai "0" saat pengguna menghapus semua digit.
 */
export function sanitizeKkmInput(raw: string): string {
  const digitsOnly = String(raw ?? "").replace(/[^0-9]/g, "");
  if (digitsOnly === "") return "";
  const trimmedLeading = digitsOnly.replace(/^0+(?=\d)/, "");
  const numeric = Number(trimmedLeading);
  if (numeric > 100) return "100";
  return trimmedLeading;
}

/**
 * Mengonversi string input KKM menjadi angka valid (0..100) atau null bila kosong/tidak valid.
 */
export function parseKkmNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (str === "") return null;
  const num = Number(str);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0 || num > 100) {
    return null;
  }
  return num;
}

export type KkmAverageTier = "below" | "borderline" | "above" | "empty";

/**
 * Opsi A (3 Warna dengan Zona Batas KKM):
 * - Merah  : nilai < KKM (Di Bawah KKM)
 * - Kuning : KKM <= nilai < KKM + 5 (Tuntas Batas)
 * - Hijau  : nilai >= KKM + 5 (Di Atas KKM Aman)
 */
export function getKkmAverageColorInfo(
  rataRata: number | null,
  kkm: number = DEFAULT_KKM_FALLBACK
): {
  tier: KkmAverageTier;
  textClass: string;
  label: string;
} {
  if (rataRata === null || !Number.isFinite(rataRata)) {
    return {
      tier: "empty",
      textClass: "text-slate-400 group-hover/row:text-slate-400",
      label: "Belum Dinilai",
    };
  }

  const threshold = Number.isFinite(kkm) ? kkm : DEFAULT_KKM_FALLBACK;
  const rounded = Number(rataRata.toFixed(2));

  if (rounded < threshold) {
    return {
      tier: "below",
      textClass: "text-rose-600 group-hover/row:text-rose-300",
      label: "Di Bawah KKM",
    };
  }

  if (rounded < threshold + 5) {
    return {
      tier: "borderline",
      textClass: "text-amber-600 group-hover/row:text-amber-300",
      label: "Tuntas Batas",
    };
  }

  return {
    tier: "above",
    textClass: "text-emerald-600 group-hover/row:text-emerald-300",
    label: "Di Atas KKM",
  };
}

export interface RawSubjectForKkm {
  id: string;
  namaMapel: string;
  guruPengampu?: string | null;
  kelasDiampu?: string | null;
}

export interface RawCurriculumForKkm {
  id: string;
  mapel: string;
  kkm: number;
  tingkat?: string | null;
  capaianKompetensi?: string | null;
}

export interface UniqueMapelKkmItem {
  key: string;
  namaMapel: string;
  kkm: number;
  isCustomKkm: boolean;
  capaianKompetensi: string;
  guruList: string[];
  kelasList: string[];
  jumlahAlokasi: number;
}

/**
 * Mengelompokkan daftar mata pelajaran menjadi 1 varian unik per nama mata pelajaran
 * untuk mode tampilan khusus KKM, lengkap dengan resolusi KKM khusus atau standar default.
 */
export function deduplicateSubjectsForKkm(
  subjects: RawSubjectForKkm[],
  curriculumList: RawCurriculumForKkm[],
  defaultKkm: number = DEFAULT_KKM_FALLBACK
): UniqueMapelKkmItem[] {
  const curriculumByKey = new Map<string, RawCurriculumForKkm>();
  for (const c of curriculumList) {
    if (!c.mapel || c.mapel === DEFAULT_KKM_KEY) continue;
    curriculumByKey.set(c.mapel.trim().toLowerCase(), c);
  }

  const grouped = new Map<
    string,
    {
      namaMapel: string;
      guruSet: Set<string>;
      kelasSet: Set<string>;
      jumlahAlokasi: number;
    }
  >();

  for (const s of subjects) {
    const cleanName = (s.namaMapel || "").trim();
    if (!cleanName) continue;
    const key = cleanName.toLowerCase();

    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        namaMapel: cleanName,
        guruSet: new Set<string>(),
        kelasSet: new Set<string>(),
        jumlahAlokasi: 0,
      };
      grouped.set(key, entry);
    }

    entry.jumlahAlokasi += 1;
    if (s.guruPengampu && s.guruPengampu.trim()) {
      entry.guruSet.add(s.guruPengampu.trim());
    }
    if (s.kelasDiampu) {
      s.kelasDiampu
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .forEach((k) => entry!.kelasSet.add(k));
    }
  }

  // Sertakan juga mapel yang sudah punya target KKM khusus meski belum ada di subjects
  for (const [key, curr] of curriculumByKey.entries()) {
    if (!grouped.has(key)) {
      grouped.set(key, {
        namaMapel: curr.mapel.trim(),
        guruSet: new Set<string>(),
        kelasSet: new Set<string>(),
        jumlahAlokasi: 0,
      });
    }
  }

  const result: UniqueMapelKkmItem[] = [];
  for (const [key, entry] of grouped.entries()) {
    const custom = curriculumByKey.get(key);
    result.push({
      key,
      namaMapel: entry.namaMapel,
      kkm: custom ? custom.kkm : defaultKkm,
      isCustomKkm: Boolean(custom),
      capaianKompetensi: custom?.capaianKompetensi || "",
      guruList: Array.from(entry.guruSet).sort((a, b) => a.localeCompare(b)),
      kelasList: Array.from(entry.kelasSet).sort((a, b) => a.localeCompare(b)),
      jumlahAlokasi: entry.jumlahAlokasi,
    });
  }

  return result.sort((a, b) => a.namaMapel.localeCompare(b.namaMapel));
}

export type EraporStatus = "Draf" | "Disahkan" | "Diterbitkan";

/**
 * Siswa hanya diizinkan melihat pratinjau penuh dan mencetak E-Rapor
 * apabila status rapor telah resmi "Diterbitkan".
 */
export function canStudentPrintErapor(
  statusRapor: string | null | undefined
): boolean {
  return statusRapor === "Diterbitkan";
}

export function getStudentEraporGateInfo(
  statusRapor: string | null | undefined
): {
  canPrint: boolean;
  status: EraporStatus;
  badgeLabel: string;
  message: string;
} {
  if (statusRapor === "Diterbitkan") {
    return {
      canPrint: true,
      status: "Diterbitkan",
      badgeLabel: "Diterbitkan",
      message: "E-Rapor resmi telah diterbitkan dan siap dicetak.",
    };
  }

  if (statusRapor === "Disahkan") {
    return {
      canPrint: false,
      status: "Disahkan",
      badgeLabel: "Disahkan",
      message: "Rapor telah disahkan wali kelas dan menunggu penerbitan resmi.",
    };
  }

  return {
    canPrint: false,
    status: "Draf",
    badgeLabel: "Belum Terbit",
    message: "Nilai sedang dalam proses penilaian dan pengesahan wali kelas.",
  };
}
