import { useNavigate } from "react-router";
import IssueStatusBadge from "../issues/IssueStatusBadge";
import { useIssues } from "../../hooks/useIssues";
import { computeIssueAgingDays } from "../../utils/issueIndicators";

interface ActivityLinkedIssuesPanelProps {
  activityId: string;
  projectId: string;
}

export default function ActivityLinkedIssuesPanel({ activityId, projectId }: ActivityLinkedIssuesPanelProps) {
  const navigate = useNavigate();
  const { issues } = useIssues(projectId);
  const linkedIssues = issues.filter((issue) => issue.relatedActivityId === activityId);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Issues vinculadas <span>({linkedIssues.length})</span>
        </div>
      </div>
      {linkedIssues.length === 0 ? (
        <div className="empty-note">Nenhuma issue vinculada a esta atividade.</div>
      ) : (
        linkedIssues.map((issue) => (
          <div
            className="issue-row"
            key={issue.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/projetos/${projectId}/issues/${issue.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/projetos/${projectId}/issues/${issue.id}`);
              }
            }}
          >
            <div className="issue-row-l">
              <b>
                {issue.id} — {issue.title}
              </b>
              <span>aberta há {computeIssueAgingDays(issue)}d</span>
            </div>
            <IssueStatusBadge status={issue.status} />
          </div>
        ))
      )}
    </div>
  );
}
