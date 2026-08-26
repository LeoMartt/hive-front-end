import { useNavigate } from "react-router";
import IssueStatusBadge from "./IssueStatusBadge";
import IssueImpactBadge from "./IssueImpactBadge";
import { computeIssueAgingDays, computeIssueRisk, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import { getInitials } from "../../utils/initials";
import type { Issue } from "../../types/issue";
import type { AgingThresholds } from "../../types/projectConfig";

interface IssueRowProps {
  issue: Issue;
  projectId: string;
  agingThresholds: AgingThresholds;
}

// Risco nulo (issue concluída) usa a cor neutra — os 3 níveis de risco usam a mesma
// paleta do IssueImpactBadge (verde/amarelo/vermelho), só que aplicada ao texto do Aging.
function agingColorClass(risk: ReturnType<typeof computeIssueRisk>): string {
  return risk === null ? "aging-neutral" : `aging-${risk}`;
}

export default function IssueRow({ issue, projectId, agingThresholds }: IssueRowProps) {
  const navigate = useNavigate();
  const aging = computeIssueAgingDays(issue);
  const risk = computeIssueRisk(issue, agingThresholds);

  function goToDetail() {
    navigate(`/projetos/${projectId}/issues/${issue.id}`);
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToDetail();
        }
      }}
    >
      <td className="mono">{issue.id}</td>
      <td>
        <div className="issue-title-text" title={issue.title}>
          {issue.title}
        </div>
        <span className="issue-area-tag">{issue.area}</span>
      </td>
      <td>{ISSUE_TYPE_LABELS[issue.type]}</td>
      <td>
        <IssueImpactBadge impact={issue.impact} />
      </td>
      <td>
        <span className={`impeditivo-tag ${issue.impeditiva ? "impeditivo-tag-sim" : "impeditivo-tag-nao"}`}>
          {issue.impeditiva ? "Sim" : "Não"}
        </span>
      </td>
      <td className="mono issue-cell-emphasis">
        {issue.relatedActivityId ?? "—"}
        {issue.cascadeActivityIds.length > 0 && (
          <span
            className="cascata-tag"
            title={`Atividades impactadas por esta issue: ${issue.cascadeActivityIds.join(", ")}`}
          >
            +{issue.cascadeActivityIds.length}
          </span>
        )}
      </td>
      <td>
        <div className="cell-person" title={issue.dev}>
          <span className="avatar-mini">{getInitials(issue.dev)}</span>
          <span className="cell-person-name">{issue.dev}</span>
        </div>
      </td>
      <td className="issue-status-cell">
        <IssueStatusBadge status={issue.status} />
      </td>
      <td className={`mono issue-cell-emphasis ${agingColorClass(risk)}`}>{`${aging}d`}</td>
    </tr>
  );
}
