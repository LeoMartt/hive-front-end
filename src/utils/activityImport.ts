import * as XLSX from "xlsx";
import { toLocalIsoString } from "./activityIndicators";
import type { NewActivityInput } from "../types/activity";
import type { TeamMember } from "../types/project";

export interface ActivityImportResult {
  valid: NewActivityInput[];
  errors: string[];
}

const HEADER_ALIASES = {
  name: ["Nome"],
  module: ["Módulo", "Modulo"],
  process: ["Processo"],
  tester: ["Tester"],
  dev: ["Desenvolvedor", "Dev"],
  plannedStart: ["Início Planejado", "Inicio Planejado"],
  plannedEnd: ["Conclusão Planejada", "Conclusao Planejada"],
  predecessors: ["Predecessores"],
  wbs: ["WBS"],
  area: ["Área", "Area"],
  system: ["Sistema"],
  transaction: ["Transação", "Transacao"],
  expectedResult: ["Resultado Esperado"],
  notes: ["Observações", "Observacoes"],
} as const;

function getRawField(row: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function getField(row: Record<string, unknown>, keys: readonly string[]): string {
  const value = getRawField(row, keys);
  return value === undefined ? "" : String(value).trim();
}

// Aceita Date real (célula de data do Excel, quando XLSX.read usa cellDates:true) ou texto
// "DD/MM/AAAA". Sempre monta a data local (new Date(ano, mes-1, dia)) antes de formatar —
// nunca `new Date(string)`, que é interpretado como UTC-midnight e pode exibir o dia
// anterior em UTC-3 (mesma classe de bug já corrigida em isOverdue/toLocalIsoString e na
// Nova Atividade).
function parseImportDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return toLocalIsoString(value);
  }
  const text = String(value ?? "").trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // new Date() normaliza dia/mês fora da faixa em vez de rejeitar (ex.: 31/02 vira 02/03) —
  // confere se o round-trip bate antes de aceitar, senão uma data de calendário inválida
  // passaria como uma data errada em vez de dar erro de validação.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toLocalIsoString(date);
}

function resolvePersonName(raw: string, candidates: TeamMember[]): string | null {
  if (!raw) return null;
  const match = candidates.find((member) => member.name.toLowerCase() === raw.toLowerCase());
  return match ? match.name : null;
}

export function parseActivityImportRows(rows: Record<string, unknown>[], team: TeamMember[]): ActivityImportResult {
  const testers = team.filter((member) => member.role === "Tester");
  const devs = team.filter((member) => member.role === "Desenvolvedor");
  const valid: NewActivityInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const lineNo = index + 2; // +1 cabeçalho, +1 índice base-1
    const problems: string[] = [];

    const name = getField(row, HEADER_ALIASES.name);
    if (!name) problems.push("nome vazio");

    const activityModule = getField(row, HEADER_ALIASES.module);
    if (!activityModule) problems.push("módulo vazio");

    const process = getField(row, HEADER_ALIASES.process);
    if (!process) problems.push("processo vazio");

    const testerRaw = getField(row, HEADER_ALIASES.tester);
    const tester = resolvePersonName(testerRaw, testers);
    if (!tester) problems.push(`tester "${testerRaw}" não reconhecido`);

    const devRaw = getField(row, HEADER_ALIASES.dev);
    const dev = resolvePersonName(devRaw, devs);
    if (!dev) problems.push(`desenvolvedor "${devRaw}" não reconhecido`);

    const plannedStart = parseImportDate(getRawField(row, HEADER_ALIASES.plannedStart));
    if (!plannedStart) problems.push("início planejado inválido");

    const plannedEnd = parseImportDate(getRawField(row, HEADER_ALIASES.plannedEnd));
    if (!plannedEnd) problems.push("conclusão planejada inválida");

    if (problems.length > 0) {
      errors.push(`Linha ${lineNo}: ${problems.join("; ")}.`);
      return;
    }

    valid.push({
      name,
      module: activityModule,
      process,
      // tester/dev/plannedStart/plannedEnd já são garantidamente não-nulos aqui — se algum
      // fosse null, a linha já teria caído em `problems` e retornado acima.
      tester: tester!,
      dev: dev!,
      plannedStart: plannedStart!,
      plannedEnd: plannedEnd!,
      predecessors: getField(row, HEADER_ALIASES.predecessors)
        .split(";")
        .map((id) => id.trim())
        .filter(Boolean),
      wbs: getField(row, HEADER_ALIASES.wbs),
      area: getField(row, HEADER_ALIASES.area),
      system: getField(row, HEADER_ALIASES.system),
      transaction: getField(row, HEADER_ALIASES.transaction),
      expectedResult: getField(row, HEADER_ALIASES.expectedResult),
      notes: getField(row, HEADER_ALIASES.notes) || null,
    });
  });

  return { valid, errors };
}

const TEMPLATE_HEADERS = [
  "Nome",
  "Módulo",
  "Processo",
  "Tester",
  "Desenvolvedor",
  "Início Planejado",
  "Conclusão Planejada",
  "Predecessores",
  "WBS",
  "Área",
  "Sistema",
  "Transação",
  "Resultado Esperado",
  "Observações",
];

const TEMPLATE_EXAMPLE_ROW = [
  "Validar cálculo de crédito ICMS",
  "Faturamento",
  "Apuração de ICMS",
  "Nome do tester do projeto",
  "Nome do desenvolvedor do projeto",
  "02/07/2026",
  "18/07/2026",
  "",
  "1.2.3",
  "Fiscal",
  "SAP ECC",
  "FB60",
  "Sistema calcula o crédito corretamente",
  "",
];

export function downloadActivityImportTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");
  XLSX.writeFile(wb, "hive_modelo_importacao_atividades.xlsx");
}
