import IssueRow from "./IssueRow";
import EmptyState from "../common/EmptyState";
import { useProjectAgingThresholds } from "../../hooks/useProjectAgingThresholds";
import type { Issue } from "../../types/issue";

interface IssuesTableProps {
  issues: Issue[];
  projectId: string;
}

export default function IssuesTable({ issues, projectId }: IssuesTableProps) {
  const agingThresholds = useProjectAgingThresholds(projectId);

  if (issues.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState
          title="Nenhuma issue encontrada"
          description="Ajuste os filtros para encontrar a issue que procura."
        />
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Tipo</th>
            <th>Impacto</th>
            <th>Impeditivo</th>
            <th>Atividade</th>
            <th>Dev</th>
            <th>Status</th>
            <th>Aging</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} projectId={projectId} agingThresholds={agingThresholds} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
