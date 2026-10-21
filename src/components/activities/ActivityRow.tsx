import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { formatActivityDate, isOverdue, retestPillClass } from "../../utils/activityIndicators";
import Avatar from "../common/Avatar";
import { shortName } from "../../utils/shortName";
import type { ActivitySummary as Activity } from "../../types/activity";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
  indent?: boolean;
  showBreadcrumb?: boolean;
  checked: boolean;
  onToggleSelect: (id: string) => void;
  canSelect: boolean;
}

export default function ActivityRow({
  activity,
  projectId,
  indent = false,
  showBreadcrumb = false,
  checked,
  onToggleSelect,
  canSelect,
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
      className={`activity-row${overdue ? " activity-row-overdue" : ""}`}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToDetail();
        }
      }}
    >
      <td className="activity-select-cell">
        {canSelect && (
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
      <td className="activity-toggle-cell"></td>
      <td className="activity-name-cell" data-label="Nome">
        <div
          className={`cell-name${showBreadcrumb ? " cell-name-stacked cell-name-breadcrumb" : ""}${indent ? " cell-name-indented" : ""}`}
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
      <td className="mono activity-id-cell" data-label="ID">{activity.id}</td>
      <td className="activity-status-cell" data-label="Status">
        <ActivityStatusBadge status={activity.status} />
      </td>
      <td className="activity-person-cell" data-label="Tester">
        <div className="cell-person" title={activity.tester}>
          <Avatar name={activity.tester} className="avatar-mini" alt="" />
          <span className="cell-person-name">{shortName(activity.tester)}</span>
        </div>
      </td>
      <td className="activity-person-cell" data-label="Dev">
        <div className="cell-person" title={activity.dev}>
          <Avatar name={activity.dev} className="avatar-mini" alt="" />
          <span className="cell-person-name">{shortName(activity.dev)}</span>
        </div>
      </td>
      <td className="mono activity-date-cell" data-label="Início plan.">{formatActivityDate(activity.plannedStart)}</td>
      <td data-label="Conclusão plan." className={`mono activity-date-cell${overdue ? " date-overdue" : ""}`}>
        {formatActivityDate(activity.plannedEnd)}
        {overdue && <span className="overdue-tag">Atrasado</span>}
      </td>
      <td className="mono activity-date-cell" data-label="Início real">{formatActivityDate(activity.actualStart)}</td>
      <td className="mono activity-date-cell" data-label="Conclusão real">{formatActivityDate(activity.actualEnd)}</td>
      <td className="mono activity-predecessors-cell" data-label="Predecessoras">
        {activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}
      </td>
      <td className="text-center activity-count-cell" data-label="Reteste">
        <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}×</span>
      </td>
      <td className="text-center activity-count-cell" data-label="Issues">{activity.issueCount}</td>
    </tr>
  );
}
