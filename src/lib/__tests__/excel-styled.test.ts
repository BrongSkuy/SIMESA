import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  buildStyledWorkbookBuffer,
  parseExcelSheetSmart,
  sanitizeSheetName,
  colIndexToLetter,
  attendanceStatusCellStyle,
  scoreCellStyle,
  podiumRowStyle,
} from "../excel-styled";

describe("excel-styled utility", () => {
  it("sanitizes invalid Excel worksheet names and enforces 31-char limit", () => {
    expect(sanitizeSheetName("Leaderboard [X-A/2025:Genap?*]", "Fallback")).toBe(
      "Leaderboard X-A 2025 Genap"
    );
    expect(sanitizeSheetName("A".repeat(40))).toHaveLength(31);
    expect(sanitizeSheetName("   ", "Default")).toBe("Default");
  });

  it("converts 1-based column indices to Excel letters", () => {
    expect(colIndexToLetter(1)).toBe("A");
    expect(colIndexToLetter(4)).toBe("D");
    expect(colIndexToLetter(26)).toBe("Z");
    expect(colIndexToLetter(27)).toBe("AA");
  });

  it("applies semantic cell styles for attendance, scores, and podium ranks", () => {
    expect(attendanceStatusCellStyle("Hadir")?.fontArgb).toBe("FF166534");
    expect(attendanceStatusCellStyle("A")?.fontArgb).toBe("FFB91C1C");
    expect(scoreCellStyle(90)?.fontArgb).toBe("FF166534");
    expect(scoreCellStyle(55)?.fontArgb).toBe("FFB91C1C");
    expect(podiumRowStyle(1)?.fillArgb).toBe("FFFEF3C7");
    expect(podiumRowStyle(4)).toBeNull();
  });

  it("generates a styled multi-sheet workbook with kop, validations, guide sheet, and round-trips through parseExcelSheetSmart", async () => {
    const buffer = await buildStyledWorkbookBuffer(
      [
        {
          name: "Format Nilai",
          title: "Template Input Nilai Siswa",
          theme: "navy",
          metadata: [
            { label: "Kelas", value: "X-A" },
            { label: "Mata Pelajaran", value: "Matematika" },
          ],
          columns: [
            { key: "NIS", header: "NIS", align: "center", numFmt: "@" },
            { key: "NamaLengkap", header: "NamaLengkap", align: "left" },
            {
              key: "Tugas",
              header: "Tugas",
              align: "center",
              isInputColumn: true,
              validation: { type: "decimal", min: 0, max: 100 },
            },
            {
              key: "UTS",
              header: "UTS",
              align: "center",
              isInputColumn: true,
              validation: { type: "decimal", min: 0, max: 100 },
            },
          ],
          rows: [
            { NIS: "2024001", NamaLengkap: "Andi Prasetyo", Tugas: 88, UTS: 84 },
            { NIS: "2024002", NamaLengkap: "Dewi Lestari", Tugas: 92, UTS: 90 },
          ],
          footerNote: "Jangan ubah kolom NIS dan nama header saat mengimpor kembali.",
        },
      ],
      {
        title: "Panduan Pengisian Template Nilai",
        theme: "navy",
        steps: [
          "Isi nilai pada kolom berwarna kuning (rentang 0 sampai 100).",
          "Simpan file lalu unggah kembali melalui tombol Impor Excel.",
        ],
        columnsGuide: [
          { kolom: "NIS", aturan: "Jangan diubah.", contoh: "2024001" },
          { kolom: "Tugas / UTS", aturan: "Angka 0 s.d. 100.", contoh: "85" },
        ],
      }
    );

    // Inspect generated workbook structure using ExcelJS
    const loadedWb = new ExcelJS.Workbook();
    await loadedWb.xlsx.load(buffer);

    expect(loadedWb.worksheets.map((w) => w.name)).toEqual([
      "Format Nilai",
      "Panduan Pengisian",
    ]);

    const mainWs = loadedWb.getWorksheet("Format Nilai")!;
    expect(mainWs.getCell("A2").value).toBe("TEMPLATE INPUT NILAI SISWA");
    expect(mainWs.getCell("A5").value).toBe("NIS");
    expect(mainWs.getCell("C5").value).toBe("Tugas");
    // Data validation attached to input cell C6
    expect(mainWs.getCell("C6").dataValidation?.type).toBe("decimal");
    expect(mainWs.getCell("C6").dataValidation?.formulae).toEqual([0, 100]);

    // Round-trip via Smart Parser (header is at row 5 + footer note at bottom)
    const parsed = parseExcelSheetSmart(buffer, {
      expectedHeaders: ["NIS", "NamaLengkap", "Tugas", "UTS"],
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      NIS: "2024001",
      NamaLengkap: "Andi Prasetyo",
      Tugas: 88,
      UTS: 84,
    });
    expect(parsed[1]).toEqual({
      NIS: "2024002",
      NamaLengkap: "Dewi Lestari",
      Tugas: 92,
      UTS: 90,
    });
  });

  it("remains 100% backward-compatible with legacy plain row-1 Excel files", () => {
    const legacyRows = [
      { No: 1, NIS: "2024006", NamaLengkap: "Putri Ayu Wulandari", StatusKehadiran: "Hadir" },
      { No: 2, NIS: "2024007", NamaLengkap: "Muhammad Ilham", StatusKehadiran: "Izin" },
    ];
    const ws = XLSX.utils.json_to_sheet(legacyRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    const legacyOut = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const parsed = parseExcelSheetSmart(legacyOut, {
      expectedHeaders: ["NIS", "NamaLengkap", "StatusKehadiran"],
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0].NIS).toBe("2024006");
    expect(parsed[0].StatusKehadiran).toBe("Hadir");
    expect(parsed[1].StatusKehadiran).toBe("Izin");
  });
});
