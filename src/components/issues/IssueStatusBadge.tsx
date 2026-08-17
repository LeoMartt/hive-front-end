import { ISSUE_STATUS_BADGE_CLASS, ISSUE_STATUS_LABELS } from "../../utils/issueIndicators";
import type { IssueStatus } from "../../types/issue";

interface IssueStatusBadgeProps {
  status: IssueStatus;
}

export default function IssueStatusBadge({ status }: IssueStatusBadgeProps) {
  return (
    <span className={`activity-badge ${ISSUE_STATUS_BADGE_CLASS[status]}`}>
      <span className="activity-badge-dot" />
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}
