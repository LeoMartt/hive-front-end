import { useNavigate } from "react-router";
import IssueStatusBadge from "./IssueStatusBadge";
import IssueImpactBadge from "./IssueImpactBadge";
import IssueRiskBadge from "./IssueRiskBadge";
import { computeIssueAgingDays, computeIssueRisk, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import { getInitials } from "../../utils/initials";
import type { Issue } from "../../types/issue";

interface IssueRowProps {
  issue: Issue;
  projectId: string;
}

export default function IssueRow({ issue, projectId }: IssueRowProps) {
  const navigate = useNavigate();
  const aging = computeIssueAgingDays(issue);
  const risk = computeIssueRisk(issue);

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
        <div className="cell-name-text" title={issue.title}>
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
      <td className="mono">
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
      <td>
        <IssueStatusBadge status={issue.status} />
      </td>
      <td className="mono">{`${aging}d`}</td>
      <td>
        <IssueRiskBadge risk={risk} />
      </td>
    </tr>
  );
}
