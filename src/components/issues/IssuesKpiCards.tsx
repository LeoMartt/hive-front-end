import StatCard from "../common/StatCard";
import { computeIssueAgingDays, computeIssueRisk } from "../../utils/issueIndicators";
import type { Issue } from "../../types/issue";

interface IssuesKpiCardsProps {
  issues: Issue[];
}

export default function IssuesKpiCards({ issues }: IssuesKpiCardsProps) {
  const abertas = issues.filter((issue) => issue.status !== "concluida");
  const impeditivasAbertas = abertas.filter((issue) => issue.impeditiva);
  const emRisco = abertas.filter((issue) => computeIssueRisk(issue) === "risco");
  const somaAging = abertas.reduce((sum, issue) => sum + computeIssueAgingDays(issue), 0);
  const tempoMedio = abertas.length === 0 ? null : somaAging / abertas.length;

  return (
    <div className="stat-grid-issues" style={{ marginBottom: 16 }}>
      <StatCard label="Issues no filtro" value={String(issues.length)} sub="nesta visualização" />
      <StatCard
        label="Impeditivas abertas"
        value={String(impeditivasAbertas.length)}
        sub="bloqueando atividade agora"
        tone="r"
      />
      <StatCard label="Em risco (aging)" value={String(emRisco.length)} sub="acima do limiar configurado" tone="r" />
      <StatCard
        label="Tempo médio aberta"
        value={tempoMedio === null ? "—" : `${tempoMedio.toFixed(1).replace(".", ",")}d`}
        sub="dias, entre as ainda abertas"
      />
    </div>
  );
}
