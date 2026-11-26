import * as XLSX from "xlsx";

export type ExcelTheme = "navy" | "emerald" | "royal" | "obsidian";

export type ExcelCellValue = string | number | boolean | null | undefined;

export interface SemanticCellStyle {
  fillArgb?: string;
  fontArgb?: string;
  bold?: boolean;
}

export type ExcelValidationSpec =
  | {
      type: "list";
      options: string[];
      promptTitle?: string;
      prompt?: string;
      errorTitle?: string;
      error?: string;
    }
  | {
      type: "decimal" | "whole";
      min: number;
      max: number;
      promptTitle?: string;
      prompt?: string;
      errorTitle?: string;
      error?: string;
    };

export interface StyledColumnDef {
  key: string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  wrapText?: boolean;
  numFmt?: string;
  isInputColumn?: boolean;
  validation?: ExcelValidationSpec;
  semanticStyle?: (
    value: ExcelCellValue,
    row: Record<string, ExcelCellValue>,
    rowIndex: number
  ) => SemanticCellStyle | null;
}

export interface StyledSheetConfig {
  name: string;
  title: string;
  subtitle?: string;
  theme?: ExcelTheme;
  metadata?: Array<{ label: string; value: string }>;
  columns: StyledColumnDef[];
  rows: Array<Record<string, ExcelCellValue>>;
  /** Extra blank pre-styled & pre-validated rows appended below data rows (useful for templates). */
  extraInputRows?: number;
  summaryRow?: Record<string, ExcelCellValue>;
  rowStyle?: (
    row: Record<string, ExcelCellValue>,
    rowIndex: number
  ) => SemanticCellStyle | null;
  freezeHeader?: boolean;
  autoFilter?: boolean;
  landscape?: boolean;
  footerNote?: string;
}

export interface GuideSheetItem {
  kolom: string;
  aturan: string;
  contoh: string;
}

export interface GuideSheetConfig {
  title: string;
  subtitle?: string;
  theme?: ExcelTheme;
  steps: string[];
  columnsGuide: GuideSheetItem[];
}

interface ThemePalette {
  bannerFill: string;
  bannerSubFont: string;
  headerFill: string;
  inputHeaderFill: string;
  accentBorder: string;
  metaFill: string;
  zebraFill: string;
  inputCellFill: string;
  inputBorder: string;
  summaryFill: string;
  summaryFont: string;
}

const THEME_PALETTES: Record<ExcelTheme, ThemePalette> = {
  navy: {
    bannerFill: "FF0F172A",
    bannerSubFont: "FF93C5FD",
    headerFill: "FF1E3A8A",
    inputHeaderFill: "FFB45309",
    accentBorder: "FF2563EB",
    metaFill: "FFF1F5F9",
    zebraFill: "FFF8FAFC",
    inputCellFill: "FFFEFCE8",
    inputBorder: "FFF59E0B",
    summaryFill: "FFEFF6FF",
    summaryFont: "FF1E3A8A",
  },
  emerald: {
    bannerFill: "FF062C22",
    bannerSubFont: "FF6EE7B7",
    headerFill: "FF065F46",
    inputHeaderFill: "FFB45309",
    accentBorder: "FF10B981",
    metaFill: "FFECFDF5",
    zebraFill: "FFF8FAFC",
    inputCellFill: "FFFEFCE8",
    inputBorder: "FFF59E0B",
    summaryFill: "FFD1FAE5",
    summaryFont: "FF065F46",
  },
  royal: {
    bannerFill: "FF12163A",
    bannerSubFont: "FFFCD34D",
    headerFill: "FF312E81",
    inputHeaderFill: "FFB45309",
    accentBorder: "FFD97706",
    metaFill: "FFFEFCE8",
    zebraFill: "FFF8FAFC",
    inputCellFill: "FFFEFCE8",
    inputBorder: "FFF59E0B",
    summaryFill: "FFFEF3C7",
    summaryFont: "FF92400E",
  },
  obsidian: {
    bannerFill: "FF0F172A",
    bannerSubFont: "FFCBD5E1",
    headerFill: "FF334155",
    inputHeaderFill: "FFB45309",
    accentBorder: "FF64748B",
    metaFill: "FFF1F5F9",
    zebraFill: "FFF8FAFC",
    inputCellFill: "FFFEFCE8",
    inputBorder: "FFF59E0B",
    summaryFill: "FFE2E8F0",
    summaryFont: "FF0F172A",
  },
};

const BORDER_THIN_SLATE = {
  style: "thin" as const,
  color: { argb: "FFCBD5E1" },
};

const BORDER_HEADER = {
  style: "thin" as const,
  color: { argb: "FF475569" },
};

/** Sanitize worksheet name to comply with Excel's 31-char & forbidden-character rules. */
export function sanitizeSheetName(raw: string, fallback = "Sheet1"): string {
  const cleaned = raw
    .replace(/[\\/*?:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 31);
}

/** Convert 1-based column index to Excel column letters (1 -> A, 27 -> AA). */
export function colIndexToLetter(colIndex: number): string {
  let n = colIndex;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || "A";
}

function formatWibTimestamp(): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date()) + " WIB";
  } catch {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
}

/* -------------------------------------------------------------------------- */
/*  Reusable Semantic Style Presets                                           */
/* -------------------------------------------------------------------------- */

export function attendanceStatusCellStyle(
  value: ExcelCellValue
): SemanticCellStyle | null {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();
  if (v === "HADIR" || v === "H") {
    return { fillArgb: "FFDCFCE7", fontArgb: "FF166534", bold: true };
  }
  if (v === "IZIN" || v === "I") {
    return { fillArgb: "FFFEF3C7", fontArgb: "FF92400E", bold: true };
  }
  if (v === "SAKIT" || v === "S") {
    return { fillArgb: "FFDBEAFE", fontArgb: "FF1D4ED8", bold: true };
  }
  if (v === "ALFA" || v === "A") {
    return { fillArgb: "FFFEE2E2", fontArgb: "FFB91C1C", bold: true };
  }
  return null;
}

export function scoreCellStyle(
  value: ExcelCellValue
): SemanticCellStyle | null {
  if (value === null || value === undefined || value === "" || value === "-") {
    return { fontArgb: "FF94A3B8" };
  }
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(num)) return null;
  if (num >= 85) {
    return { fillArgb: "FFDCFCE7", fontArgb: "FF166534", bold: true };
  }
  if (num >= 75) {
    return { fillArgb: "FFDBEAFE", fontArgb: "FF1E40AF", bold: true };
  }
  if (num >= 60) {
    return { fillArgb: "FFFEF3C7", fontArgb: "FF92400E", bold: true };
  }
  return { fillArgb: "FFFEE2E2", fontArgb: "FFB91C1C", bold: true };
}

export function statusBadgeCellStyle(
  value: ExcelCellValue
): SemanticCellStyle | null {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    v === "aktif" ||
    v === "lengkap" ||
    v === "tuntas" ||
    v === "sangat baik" ||
    v === "terpublikasi" ||
    v === "diterbitkan"
  ) {
    return { fillArgb: "FFDCFCE7", fontArgb: "FF166534", bold: true };
  }
  if (
    v === "sebagian" ||
    v === "arsip" ||
    v === "baik" ||
    v === "cukup" ||
    v === "draf"
  ) {
    return { fillArgb: "FFFEF3C7", fontArgb: "FF92400E", bold: true };
  }
  if (
    v === "nonaktif" ||
    v === "belum dinilai" ||
    v === "perlu perbaikan" ||
    v === "hapus" ||
    v === "delete"
  ) {
    return { fillArgb: "FFFEE2E2", fontArgb: "FFB91C1C", bold: true };
  }
  return null;
}

export function podiumRowStyle(rank: unknown): SemanticCellStyle | null {
  const num = Number(rank);
  if (num === 1) {
    return { fillArgb: "FFFEF3C7", fontArgb: "FF92400E", bold: true };
  }
  if (num === 2) {
    return { fillArgb: "FFF1F5F9", fontArgb: "FF334155", bold: true };
  }
  if (num === 3) {
    return { fillArgb: "FFFFEDD5", fontArgb: "FF9A3412", bold: true };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Styled Workbook Builder (ExcelJS, lazy-loaded for 0KB initial bundle)     */
/* -------------------------------------------------------------------------- */

export async function buildStyledWorkbookBuffer(
  sheets: StyledSheetConfig[],
  guide?: GuideSheetConfig
): Promise<ArrayBuffer> {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIMESA — SMK Penerbangan Dirgantara";
  workbook.created = new Date();

  const usedNames = new Set<string>();
  const allocateName = (preferred: string): string => {
    const base = sanitizeSheetName(preferred);
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    for (let i = 2; i < 99; i++) {
      const suffix = ` (${i})`;
      const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
    }
    return base;
  };

  for (const sheetCfg of sheets) {
    const palette = THEME_PALETTES[sheetCfg.theme ?? "navy"];
    const ws = workbook.addWorksheet(allocateName(sheetCfg.name), {
      properties: { defaultRowHeight: 22 },
      views: [
        sheetCfg.freezeHeader !== false
          ? { state: "frozen", ySplit: 5, showGridLines: true }
          : { showGridLines: true },
      ],
    });

    const cols = sheetCfg.columns;
    const totalCols = Math.max(1, cols.length);
    const lastColLetter = colIndexToLetter(totalCols);

    // Row 1: Institutional Kop Banner
    ws.mergeCells(`A1:${lastColLetter}1`);
    const kopCell = ws.getCell("A1");
    kopCell.value =
      sheetCfg.subtitle || "SMK PENERBANGAN DIRGANTARA  •  SISTEM INFORMASI SIMESA";
    kopCell.font = {
      name: "Calibri",
      size: 9.5,
      bold: true,
      color: { argb: palette.bannerSubFont },
    };
    kopCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.bannerFill },
    };
    kopCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 20;

    // Row 2: Document Title Banner
    ws.mergeCells(`A2:${lastColLetter}2`);
    const titleCell = ws.getCell("A2");
    titleCell.value = sheetCfg.title.toUpperCase();
    titleCell.font = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.bannerFill },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(2, c).border = {
        bottom: { style: "medium", color: { argb: palette.accentBorder } },
      };
    }
    ws.getRow(2).height = 28;

    // Row 3: Metadata Info Strip
    ws.mergeCells(`A3:${lastColLetter}3`);
    const metaItems = [
      ...(sheetCfg.metadata ?? []),
      { label: "Diunduh", value: formatWibTimestamp() },
    ];
    const metaCell = ws.getCell("A3");
    metaCell.value = metaItems.map((m) => `${m.label}: ${m.value}`).join("   |   ");
    metaCell.font = {
      name: "Calibri",
      size: 9.5,
      color: { argb: "FF334155" },
    };
    metaCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.metaFill },
    };
    metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(3, c).border = {
        bottom: BORDER_THIN_SLATE,
      };
    }
    ws.getRow(3).height = 21;

    // Row 4: Clean Visual Spacer
    ws.getRow(4).height = 8;

    // Row 5: Table Header
    const headerRowIdx = 5;
    const headerRow = ws.getRow(headerRowIdx);
    headerRow.height = 28;

    cols.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = {
        name: "Calibri",
        size: 10.5,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: col.isInputColumn ? palette.inputHeaderFill : palette.headerFill,
        },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col.align ?? "center",
        wrapText: true,
      };
      cell.border = {
        top: BORDER_HEADER,
        bottom: { style: "medium", color: { argb: palette.accentBorder } },
        left: BORDER_HEADER,
        right: BORDER_HEADER,
      };
    });

    // Track auto-fit column widths
    const measuredWidths = cols.map((col) =>
      Math.max(col.minWidth ?? 10, col.header.length + 5)
    );

    const extraRows = Math.max(0, sheetCfg.extraInputRows ?? 0);
    const totalDataRows = sheetCfg.rows.length + extraRows;

    for (let rIdx = 0; rIdx < totalDataRows; rIdx++) {
      const isExtraBlank = rIdx >= sheetCfg.rows.length;
      const rowData = isExtraBlank ? {} : sheetCfg.rows[rIdx];
      const excelRowNum = headerRowIdx + 1 + rIdx;
      const excelRow = ws.getRow(excelRowNum);
      excelRow.height = 22;

      const customRowStyle =
        !isExtraBlank && sheetCfg.rowStyle ? sheetCfg.rowStyle(rowData, rIdx) : null;
      const isZebra = rIdx % 2 === 1;

      cols.forEach((col, cIdx) => {
        const cell = excelRow.getCell(cIdx + 1);
        const rawVal = isExtraBlank ? "" : rowData[col.key];
        const cellVal = rawVal === undefined || rawVal === null ? "" : rawVal;
        cell.value = cellVal;

        if (col.numFmt) {
          cell.numFmt = col.numFmt;
        }

        const strLen = String(cellVal).length;
        if (strLen + 4 > measuredWidths[cIdx]) {
          measuredWidths[cIdx] = strLen + 4;
        }

        const semantic =
          !isExtraBlank && col.semanticStyle
            ? col.semanticStyle(rawVal, rowData, rIdx)
            : null;

        const fillArgb =
          semantic?.fillArgb ??
          (col.isInputColumn
            ? palette.inputCellFill
            : customRowStyle?.fillArgb ??
              (isZebra ? palette.zebraFill : "FFFFFFFF"));

        const fontArgb =
          semantic?.fontArgb ?? customRowStyle?.fontArgb ?? "FF0F172A";
        const isBold = Boolean(semantic?.bold ?? customRowStyle?.bold);

        cell.font = {
          name: "Calibri",
          size: 10.5,
          bold: isBold,
          color: { argb: fontArgb },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillArgb },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal:
            col.align ?? (typeof cellVal === "number" ? "center" : "left"),
          wrapText: Boolean(col.wrapText),
        };
        cell.border = {
          top: BORDER_THIN_SLATE,
          bottom: BORDER_THIN_SLATE,
          left: col.isInputColumn
            ? { style: "thin", color: { argb: palette.inputBorder } }
            : BORDER_THIN_SLATE,
          right: col.isInputColumn
            ? { style: "thin", color: { argb: palette.inputBorder } }
            : BORDER_THIN_SLATE,
        };

        // Native Excel Data Validation
        if (col.validation) {
          if (col.validation.type === "list") {
            const cleanOpts = col.validation.options
              .map((o) => o.replace(/"/g, "").trim())
              .filter(Boolean);
            const joined = cleanOpts.join(",");
            if (cleanOpts.length > 0 && joined.length <= 240) {
              cell.dataValidation = {
                type: "list",
                allowBlank: true,
                formulae: [`"${joined}"`],
                showInputMessage: Boolean(col.validation.prompt),
                promptTitle: col.validation.promptTitle,
                prompt: col.validation.prompt,
                showErrorMessage: true,
                errorStyle: "warning",
                errorTitle: col.validation.errorTitle ?? "Pilihan Tidak Valid",
                error:
                  col.validation.error ??
                  `Silakan pilih salah satu dari: ${cleanOpts.join(", ")}`,
              };
            }
          } else {
            cell.dataValidation = {
              type: col.validation.type,
              operator: "between",
              allowBlank: true,
              formulae: [col.validation.min, col.validation.max],
              showInputMessage: Boolean(col.validation.prompt),
              promptTitle: col.validation.promptTitle,
              prompt: col.validation.prompt,
              showErrorMessage: true,
              errorStyle: "stop",
              errorTitle: col.validation.errorTitle ?? "Nilai Di Luar Batas",
              error:
                col.validation.error ??
                `Masukkan angka antara ${col.validation.min} sampai ${col.validation.max}.`,
            };
          }
        }
      });
    }

    let nextRowNum = headerRowIdx + 1 + totalDataRows;

    // Optional Summary Row
    if (sheetCfg.summaryRow) {
      const sumRow = ws.getRow(nextRowNum);
      sumRow.height = 25;
      cols.forEach((col, cIdx) => {
        const cell = sumRow.getCell(cIdx + 1);
        const val = sheetCfg.summaryRow?.[col.key];
        cell.value = val === undefined || val === null ? "" : val;
        if (col.numFmt && typeof val === "number") {
          cell.numFmt = col.numFmt;
        }
        const strLen = String(cell.value).length;
        if (strLen + 4 > measuredWidths[cIdx]) {
          measuredWidths[cIdx] = strLen + 4;
        }
        cell.font = {
          name: "Calibri",
          size: 10.5,
          bold: true,
          color: { argb: palette.summaryFont },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: palette.summaryFill },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal:
            col.align ?? (typeof val === "number" ? "center" : "left"),
        };
        cell.border = {
          top: { style: "medium", color: { argb: palette.accentBorder } },
          bottom: { style: "double", color: { argb: palette.accentBorder } },
          left: BORDER_THIN_SLATE,
          right: BORDER_THIN_SLATE,
        };
      });
      nextRowNum++;
    }

    // Optional Footer Note
    if (sheetCfg.footerNote) {
      nextRowNum++; // 1 blank spacer row
      ws.mergeCells(`A${nextRowNum}:${lastColLetter}${nextRowNum}`);
      const noteCell = ws.getCell(`A${nextRowNum}`);
      noteCell.value = `Catatan: ${sheetCfg.footerNote}`;
      noteCell.font = {
        name: "Calibri",
        size: 9,
        italic: true,
        color: { argb: "FF64748B" },
      };
      noteCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      ws.getRow(nextRowNum).height = 20;
    }

    // Apply calculated column widths
    cols.forEach((col, idx) => {
      const minW = col.minWidth ?? 10;
      const maxW = col.maxWidth ?? 46;
      const finalWidth =
        col.width ?? Math.min(maxW, Math.max(minW, measuredWidths[idx]));
      ws.getColumn(idx + 1).width = finalWidth;
    });

    // AutoFilter on header row when data exists
    if (sheetCfg.autoFilter !== false && sheetCfg.rows.length > 0) {
      ws.autoFilter = {
        from: { row: headerRowIdx, column: 1 },
        to: { row: headerRowIdx, column: totalCols },
      };
    }

    // Print / Page Setup (A4, Fit to 1 page wide, repeat header)
    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: sheetCfg.landscape ?? totalCols > 5 ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:5",
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.25,
        footer: 0.25,
      },
    };
  }

  // Optional Sheet 2: Panduan Pengisian (for Templates)
  if (guide) {
    const palette = THEME_PALETTES[guide.theme ?? "navy"];
    const gws = workbook.addWorksheet(allocateName("Panduan Pengisian"), {
      views: [{ showGridLines: true }],
    });

    gws.mergeCells("A1:C1");
    const gKop = gws.getCell("A1");
    gKop.value = "SMK PENERBANGAN DIRGANTARA  •  PANDUAN TEMPLATE EXCEL SIMESA";
    gKop.font = {
      name: "Calibri",
      size: 9.5,
      bold: true,
      color: { argb: palette.bannerSubFont },
    };
    gKop.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.bannerFill },
    };
    gKop.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    gws.getRow(1).height = 20;

    gws.mergeCells("A2:C2");
    const gTitle = gws.getCell("A2");
    gTitle.value = guide.title.toUpperCase();
    gTitle.font = {
      name: "Calibri",
      size: 13.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    gTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.bannerFill },
    };
    gTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    gws.getRow(2).height = 28;

    gws.getRow(3).height = 10;

    // Steps Section
    gws.mergeCells("A4:C4");
    const stepHeader = gws.getCell("A4");
    stepHeader.value = "LANGKAH PENGISIAN & IMPOR";
    stepHeader.font = {
      name: "Calibri",
      size: 10.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    stepHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.headerFill },
    };
    stepHeader.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    gws.getRow(4).height = 24;

    let rowCursor = 5;
    guide.steps.forEach((step, idx) => {
      gws.mergeCells(`A${rowCursor}:C${rowCursor}`);
      const c = gws.getCell(`A${rowCursor}`);
      c.value = `${idx + 1}. ${step}`;
      c.font = { name: "Calibri", size: 10.5, color: { argb: "FF1E293B" } };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF" },
      };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
      for (let col = 1; col <= 3; col++) {
        gws.getCell(rowCursor, col).border = {
          top: BORDER_THIN_SLATE,
          bottom: BORDER_THIN_SLATE,
          left: BORDER_THIN_SLATE,
          right: BORDER_THIN_SLATE,
        };
      }
      gws.getRow(rowCursor).height = 22;
      rowCursor++;
    });

    rowCursor++; // Blank row

    // Columns Guide Table
    const colHdrRow = gws.getRow(rowCursor);
    colHdrRow.height = 25;
    ["Nama Kolom", "Ketentuan Pengisian", "Contoh Valid"].forEach((lbl, idx) => {
      const cell = colHdrRow.getCell(idx + 1);
      cell.value = lbl;
      cell.font = {
        name: "Calibri",
        size: 10.5,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: palette.headerFill },
      };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      cell.border = {
        top: BORDER_HEADER,
        bottom: { style: "medium", color: { argb: palette.accentBorder } },
        left: BORDER_HEADER,
        right: BORDER_HEADER,
      };
    });
    rowCursor++;

    guide.columnsGuide.forEach((item, idx) => {
      const r = gws.getRow(rowCursor);
      r.height = 24;
      const vals = [item.kolom, item.aturan, item.contoh];
      vals.forEach((v, cIdx) => {
        const cell = r.getCell(cIdx + 1);
        cell.value = v;
        cell.font = {
          name: "Calibri",
          size: 10,
          bold: cIdx === 0,
          color: { argb: cIdx === 0 ? "FF0F172A" : "FF334155" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 1,
          wrapText: true,
        };
        cell.border = {
          top: BORDER_THIN_SLATE,
          bottom: BORDER_THIN_SLATE,
          left: BORDER_THIN_SLATE,
          right: BORDER_THIN_SLATE,
        };
      });
      rowCursor++;
    });

    gws.getColumn(1).width = 24;
    gws.getColumn(2).width = 56;
    gws.getColumn(3).width = 28;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }
  const uint8 = new Uint8Array(buffer as ArrayLike<number>);
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
}

/** Generate and immediately download a styled .xlsx workbook in the browser. */
export async function downloadStyledExcel(
  filename: string,
  sheets: StyledSheetConfig[],
  guide?: GuideSheetConfig
): Promise<void> {
  const arrayBuffer = await buildStyledWorkbookBuffer(sheets, guide);
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* -------------------------------------------------------------------------- */
/*  Smart Import Parser (Backward-Compatible with Legacy & Styled Templates)  */
/* -------------------------------------------------------------------------- */

function normalizeHeaderToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export interface SmartParseOptions {
  /** Candidate header names (case-insensitive) used to auto-detect the table header row. */
  expectedHeaders: string[];
  /** Maximum top rows to scan for the header row (default: 15). */
  maxScanRows?: number;
}

/**
 * Reads Sheet 1 of an uploaded Excel (.xlsx/.xls) file and automatically locates
 * the table header row — supporting both new styled SIMESA templates (with Kop banner
 * on rows 1–4) and legacy plain files (header on row 1).
 * Automatically skips empty rows and system footer notes ("Catatan: ...").
 */
export function parseExcelSheetSmart(
  arrayBuffer: ArrayBuffer,
  options: SmartParseOptions
): Array<Record<string, string | number>> {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (aoa.length === 0) return [];

  const normalizedExpected = new Set(
    options.expectedHeaders.map((h) => normalizeHeaderToken(h)).filter(Boolean)
  );
  const maxScan = Math.min(options.maxScanRows ?? 15, aoa.length);

  let headerRowIdx = 0;
  let bestScore = -1;

  for (let r = 0; r < maxScan; r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    for (const cell of row) {
      const token = normalizeHeaderToken(cell);
      if (token && normalizedExpected.has(token)) {
        score++;
      }
    }
    if (score > bestScore && score > 0) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  const rawHeaders = Array.isArray(aoa[headerRowIdx]) ? aoa[headerRowIdx] : [];
  const headers = rawHeaders.map((h) => String(h ?? "").trim());

  const results: Array<Record<string, string | number>> = [];

  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;

    // Skip footer/note rows or completely blank rows
    const firstNonEmpty = row.find((v) => String(v ?? "").trim() !== "");
    if (firstNonEmpty === undefined) continue;
    const firstStr = String(firstNonEmpty).trim();
    if (
      firstStr.toLowerCase().startsWith("catatan:") ||
      firstStr.toLowerCase().startsWith("rata-rata kelas")
    ) {
      continue;
    }

    const obj: Record<string, string | number> = {};
    let hasValue = false;

    headers.forEach((headerName, colIdx) => {
      if (!headerName) return;
      const cellVal = row[colIdx];
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== "") {
        hasValue = true;
      }
      if (typeof cellVal === "number") {
        obj[headerName] = cellVal;
      } else {
        obj[headerName] = cellVal === undefined || cellVal === null ? "" : String(cellVal);
      }
    });

    if (hasValue) {
      results.push(obj);
    }
  }

  return results;
}
