import StatCard from "../common/StatCard";
import type { Issue } from "../../types/issue";

interface IssuesKpiCardsProps {
  issues: Issue[];
}

export default function IssuesKpiCards({ issues }: IssuesKpiCardsProps) {
  const abertas = issues.filter((issue) => issue.status === "aberta");
  const propostas = issues.filter((issue) => issue.status === "solucao_proposta");
  const concluidas = issues.filter((issue) => issue.status === "concluida");
  const duracoes = concluidas.flatMap((issue) => {
    if (!issue.resolvedAt) return [];
    const dias = (Date.parse(issue.resolvedAt) - Date.parse(issue.openedAt)) / 86400000;
    return Number.isFinite(dias) && dias >= 0 ? [dias] : [];
  });
  const tempoMedio = duracoes.length ? duracoes.reduce((sum, dias) => sum + dias, 0) / duracoes.length : null;

  return (
    <div className="stat-grid-issues stat-grid-issues-5" style={{ marginBottom: 16 }}>
      <StatCard label="Total de issues" value={String(issues.length)} sub="nesta visualização" />
      <StatCard label="Total issues abertas" value={String(abertas.length)} sub="status Aberta" tone="r" />
      <StatCard label="Total issues solução proposta" value={String(propostas.length)} sub="aguardando reteste" tone="y" />
      <StatCard label="Total issues concluídas" value={String(concluidas.length)} sub="encerradas com aprovação" tone="g" />
      <StatCard
        label="Tempo médio resolução"
        value={tempoMedio === null ? "—" : `${tempoMedio.toFixed(1).replace(".", ",")}d`}
        sub="dias, entre as concluídas"
      />
    </div>
  );
}
