import { ISSUE_IMPACT_BADGE_CLASS, ISSUE_IMPACT_LABELS } from "../../utils/issueIndicators";
import type { IssueImpact } from "../../types/issue";

interface IssueImpactBadgeProps {
  impact: IssueImpact;
}

export default function IssueImpactBadge({ impact }: IssueImpactBadgeProps) {
  return <span className={`impact-badge ${ISSUE_IMPACT_BADGE_CLASS[impact]}`}>{ISSUE_IMPACT_LABELS[impact]}</span>;
}
