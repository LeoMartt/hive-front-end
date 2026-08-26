import IssueRow from "./IssueRow";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
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
            <th>
              ID{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Título{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Tipo{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Impacto{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>Impeditivo</th>
            <th>
              Atividade{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Dev{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Status{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Aging{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
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
