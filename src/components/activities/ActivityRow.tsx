import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { formatActivityDate, isBulkSelectable, isOverdue, retestPillClass } from "../../utils/activityIndicators";
import { getInitials } from "../../utils/initials";
import { shortName } from "../../utils/shortName";
import type { Activity } from "../../types/activity";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
  indent?: boolean;
  showBreadcrumb?: boolean;
  checked: boolean;
  onToggleSelect: (id: string) => void;
}

export default function ActivityRow({
  activity,
  projectId,
  indent = false,
  showBreadcrumb = false,
  checked,
  onToggleSelect,
}: ActivityRowProps) {
  const navigate = useNavigate();
  const overdue = isOverdue(activity);

  function goToDetail() {
    navigate(`/projetos/${projectId}/atividades/${activity.id}`);
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      className={overdue ? "activity-row-overdue" : undefined}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToDetail();
        }
      }}
    >
      <td>
        {isBulkSelectable(activity) && (
          <input
            type="checkbox"
            aria-label={`Selecionar ${activity.name}`}
            checked={checked}
            onChange={() => onToggleSelect(activity.id)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          />
        )}
      </td>
      <td></td>
      <td>
        <div
          className={showBreadcrumb ? "cell-name cell-name-stacked" : "cell-name"}
          style={indent ? { paddingLeft: 34 } : showBreadcrumb ? { paddingLeft: 10 } : undefined}
        >
          <span className="cell-name-text" title={activity.name}>
            {activity.name}
          </span>
          {showBreadcrumb && (
            <span className="flat-breadcrumb">
              {activity.module} › {activity.process}
            </span>
          )}
        </div>
      </td>
      <td className="mono">{activity.id}</td>
      <td>
        <ActivityStatusBadge status={activity.status} />
      </td>
      <td>
        <div className="cell-person" title={activity.tester}>
          <span className="avatar-mini">{getInitials(activity.tester)}</span>
          <span className="cell-person-name">{shortName(activity.tester)}</span>
        </div>
      </td>
      <td>
        <div className="cell-person" title={activity.dev}>
          <span className="avatar-mini">{getInitials(activity.dev)}</span>
          <span className="cell-person-name">{shortName(activity.dev)}</span>
        </div>
      </td>
      <td className="mono">{formatActivityDate(activity.plannedStart)}</td>
      <td className={`mono${overdue ? " date-overdue" : ""}`}>
        {formatActivityDate(activity.plannedEnd)}
        {overdue && <span className="overdue-tag">Atrasado</span>}
      </td>
      <td className="mono">{formatActivityDate(activity.actualStart)}</td>
      <td className="mono">{formatActivityDate(activity.actualEnd)}</td>
      <td className="mono">{activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}</td>
      <td className="text-center">
        <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}×</span>
      </td>
      <td className="text-center">{activity.issueCount}</td>
    </tr>
  );
}
