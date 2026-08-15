import { useState } from "react";
import type { LogEntry } from "../types/activityLog";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const INITIAL_LOG_ENTRIES: LogEntry[] = [
  {
    id: "log-1",
    icon: "block",
    refId: "ATV-1009",
    refName: "Testar integração com banco emissor",
    text: "mudou de Em execução para Bloqueado (2º reteste)",
    authorInitials: "RL",
    authorName: "R. Lima",
    at: minutesAgo(12),
  },
  {
    id: "log-2",
    icon: "issue",
    refId: "ISS-0294",
    refName: "Segunda ocorrência de timeout no CNAB 240 aguardando análise",
    text: "registrada como impeditiva",
    authorInitials: "GD",
    authorName: "G. Def.",
    at: minutesAgo(38),
  },
  {
    id: "log-3",
    icon: "done",
    refId: "ATV-1017",
    refName: "Testar atualização cadastral em massa",
    text: "aprovada com evidência — Concluído",
    authorInitials: "CP",
    authorName: "C. Prado",
    at: minutesAgo(60),
  },
  {
    id: "log-4",
    icon: "issue",
    refId: "ISS-0298",
    refName: "Upload de documentos falha para arquivos acima de 10MB",
    text: "mudou de Em análise para Solução proposta",
    authorInitials: "JP",
    authorName: "J. Prado",
    at: minutesAgo(80),
  },
  {
    id: "log-5",
    icon: "status",
    refId: "ATV-1012",
    refName: "Validar upload de documentos",
    text: "mudou de Aguardando para Em execução",
    authorInitials: "RS",
    authorName: "Rafael Souza",
    at: minutesAgo(120),
  },
  {
    id: "log-6",
    icon: "block",
    refId: "ISS-0296",
    refName: "Ambiente sem massa de dados de fornecedores",
    text: "aberta há 6 dias segue Em análise — SLA em risco",
    authorInitials: "GD",
    authorName: "G. Def.",
    at: minutesAgo(180),
  },
  {
    id: "log-7",
    icon: "done",
    refId: "ATV-1010",
    refName: "Testar cadastro de cliente PJ",
    text: "marcada como Concluída após reteste aprovado",
    authorInitials: "MT",
    authorName: "M. Torres",
    at: minutesAgo(300),
  },
];

export function useActivityLog(projectId: string): LogEntry[] {
  // Log estático — não há modelo de auditoria/histórico real ainda.
  void projectId;
  const [entries] = useState<LogEntry[]>(INITIAL_LOG_ENTRIES);
  return entries;
}
