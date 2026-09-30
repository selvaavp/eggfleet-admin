import type { Alignment, Borders, Fill, Worksheet } from 'exceljs';
import { cellKind, columnTotals, numericColumns, type ReportCell, type ReportTable } from '@/lib/report-tables';

export interface ReportExcelOptions {
  filename: string;
  sheetName: string;
  title: string;
  /** Lines under the title, e.g. "Report Date: 30 Sep 2026". */
  meta: string[];
  /** Tables stacked top to bottom on one sheet. */
  tables: ReportTable[];
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const LINE = { style: 'thin', color: { argb: 'FF9CA3AF' } } as const;
const BORDER: Partial<Borders> = { top: LINE, left: LINE, bottom: LINE, right: LINE };
const HEAD_FILL: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
const TOP_LEFT: Partial<Alignment> = { vertical: 'top', horizontal: 'left', wrapText: true };
const TOP_RIGHT: Partial<Alignment> = { vertical: 'top', horizontal: 'right' };

/** Grouping follows the PC's regional settings, so Indian systems show 1,18,327.50. */
const NUMBER_FORMAT = { money: '#,##0.00', percent: '0"%"', count: '#,##0' } as const;

const SERIAL_WIDTH = 6;
const MIN_WIDTH = 9;
const MAX_WIDTH = 34;
/** Width of a long-text column when there are no spare columns to merge it across. */
const WIDE_WIDTH = 70;
const LINE_HEIGHT = 15;

/** Rough on-screen length of a cell, for sizing columns. */
function displayLength(value: ReportCell): number {
  return typeof value === 'number' ? value.toFixed(2).length + 2 : value.length;
}

/** Lines a wrapped header needs in a column `width` characters wide. */
function wrappedLines(text: string, width: number): number {
  let lines = 1;
  let used = 0;
  for (const word of text.split(' ')) {
    if (used > 0 && used + 1 + word.length > width) {
      lines += 1;
      used = word.length;
    } else {
      used += (used > 0 ? 1 : 0) + word.length;
    }
  }
  return lines;
}

/**
 * Writes the tables one below another — each with a serial-number column, a bold
 * header row, borders and a Total row — and sizes the columns to their content.
 */
function writeTables(ws: Worksheet, { title, meta, tables }: ReportExcelOptions): void {
  const lastCol = Math.max(...tables.map((t) => t.headers.length)) + 1;
  const widths: number[] = Array(lastCol + 1).fill(MIN_WIDTH);
  widths[1] = SERIAL_WIDTH;
  /** Rows whose height is set once the column widths are known. */
  const headerRows: { row: number; headers: string[]; wideCol: number }[] = [];
  const wideCells: { row: number; col: number; length: number }[] = [];
  let r = 1;

  const bannerRow = (text: string, font: { size: number; bold?: boolean; color?: { argb: string } }) => {
    ws.mergeCells(r, 1, r, lastCol);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    cell.font = font;
    r += 1;
  };

  bannerRow(title, { size: 14, bold: true });
  meta.forEach((line) => bannerRow(line, { size: 10, color: { argb: 'FF4B5563' } }));
  r += 1;

  tables.forEach((table, index) => {
    const { headers, rows } = table;
    const numeric = numericColumns(table);
    const wideCol = table.wideColumn ? headers.indexOf(table.wideColumn) + 2 : 0;
    const spanWide = wideCol > 0 && wideCol < lastCol;
    const fit = (col: number, length: number) => {
      if (col !== wideCol) widths[col] = Math.min(MAX_WIDTH, Math.max(widths[col], length + 2));
    };

    bannerRow(`${tables.length > 1 ? `${index + 1}. ` : ''}${table.title}`, { size: 11, bold: true });

    // Header row
    ['S.No', ...headers].forEach((header, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = HEAD_FILL;
      cell.border = BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: i > 0 && numeric[i - 1] ? 'right' : i === 0 ? 'center' : 'left',
        wrapText: true,
      };
      // Headers wrap, so only their longest word has to fit
      if (i > 0) fit(i + 1, Math.max(...header.split(' ').map((word) => word.length)));
    });
    if (spanWide) ws.mergeCells(r, wideCol, r, lastCol);
    headerRows.push({ row: r, headers, wideCol });
    r += 1;

    if (rows.length === 0) {
      ws.mergeCells(r, 1, r, spanWide ? lastCol : headers.length + 1);
      const cell = ws.getCell(r, 1);
      cell.value = 'No records for this date';
      cell.font = { italic: true, color: { argb: 'FF6B7280' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = BORDER;
      r += 2;
      return;
    }

    rows.forEach((row, rowIndex) => {
      const serial = ws.getCell(r, 1);
      serial.value = rowIndex + 1;
      serial.alignment = { vertical: 'top', horizontal: 'center' };
      serial.border = BORDER;

      row.forEach((value, col) => {
        const cell = ws.getCell(r, col + 2);
        cell.value = value;
        cell.border = BORDER;
        if (typeof value === 'number') {
          cell.numFmt = NUMBER_FORMAT[cellKind(table, row, col)];
          cell.alignment = TOP_RIGHT;
        } else {
          cell.alignment = TOP_LEFT;
        }
        fit(col + 2, displayLength(value));
      });

      if (wideCol > 0) {
        if (spanWide) ws.mergeCells(r, wideCol, r, lastCol);
        wideCells.push({ row: r, col: wideCol, length: String(row[wideCol - 2]).length });
      }
      r += 1;
    });

    const totals = columnTotals(table);
    if (!table.rowLabels && totals.some((total) => total !== null)) {
      for (let c = 1; c <= headers.length + 1; c += 1) {
        const cell = ws.getCell(r, c);
        const total = c >= 2 ? totals[c - 2] : null;
        if (c === 2) cell.value = 'Total';
        if (total !== null) {
          cell.value = total;
          cell.numFmt = NUMBER_FORMAT[cellKind(table, [], c - 2)];
          cell.alignment = TOP_RIGHT;
          fit(c, displayLength(total));
        }
        cell.font = { bold: true };
        cell.fill = HEAD_FILL;
        cell.border = BORDER;
      }
      if (spanWide) ws.mergeCells(r, wideCol, r, lastCol);
      r += 1;
    }
    r += 1;
  });

  for (let c = 1; c <= lastCol; c += 1) ws.getColumn(c).width = widths[c];

  // Bold text runs a little wider than the column's character count
  headerRows.forEach(({ row, headers, wideCol }) => {
    const lines = headers.map((header, i) => (i + 2 === wideCol ? 1 : wrappedLines(header, widths[i + 2] * 0.85)));
    ws.getRow(row).height = Math.max(...lines) * LINE_HEIGHT + 3;
  });

  // Excel does not grow a row to fit wrapped text in merged cells — estimate the height.
  wideCells.forEach(({ row, col, length }) => {
    let chars = WIDE_WIDTH;
    if (col < lastCol) chars = widths.slice(col, lastCol + 1).reduce((sum, w) => sum + w, 0);
    else ws.getColumn(col).width = WIDE_WIDTH;
    ws.getRow(row).height = Math.max(1, Math.ceil(length / (chars * 0.9))) * LINE_HEIGHT;
  });
}

/** Build a formatted .xlsx report in the browser and download it. */
export async function downloadReportExcel(options: ReportExcelOptions): Promise<void> {
  // Large library — load it only when someone actually exports.
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EggFleet';
  workbook.created = new Date();
  const ws = workbook.addWorksheet(options.sheetName, {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  writeTables(ws, options);

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
