import * as XLSX from "xlsx";

export function downloadXlsx(
  rows: Record<string, string>[],
  columnWidths: number[],
  sheetName: string,
  filenamePrefix: string,
  projectName: string,
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = columnWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const now = new Date();
  const stamp = [now.getDate(), now.getMonth() + 1, now.getFullYear()]
    .map((part) => String(part).padStart(2, "0")).join("-");
  const safeProjectName = projectName.trim().replace(/[<>:"/\\|?*\p{Cc}]/gu, "_") || "Projeto";
  XLSX.writeFile(wb, `${filenamePrefix} - ${safeProjectName} - ${stamp}.xlsx`);
}
