import { ACTIVITY_STATUS_BADGE_CLASS, ACTIVITY_STATUS_LABELS } from "../../utils/activityIndicators";
import type { ActivityStatus } from "../../types/activity";

interface ActivityStatusBadgeProps {
  status: ActivityStatus;
}

export default function ActivityStatusBadge({ status }: ActivityStatusBadgeProps) {
  return (
    <span className={`activity-badge ${ACTIVITY_STATUS_BADGE_CLASS[status]}`}>
      <span className="activity-badge-dot" />
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}
