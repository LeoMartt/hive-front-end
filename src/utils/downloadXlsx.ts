import * as XLSX from "xlsx";

export function downloadXlsx(
  rows: Record<string, string>[],
  columnWidths: number[],
  sheetName: string,
  filenamePrefix: string,
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = columnWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${stamp}.xlsx`);
}
