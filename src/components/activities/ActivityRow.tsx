import { useNavigate } from "react-router";
import Form from "react-bootstrap/Form";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { isOverdue } from "../../utils/activityIndicators";
import { getInitials } from "../../utils/initials";
import type { Activity } from "../../types/activity";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
  indent?: boolean;
  showBreadcrumb?: boolean;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

function retestPillClass(retestCount: number): string {
  if (retestCount === 0) return "retest-pill";
  if (retestCount <= 2) return "retest-pill retest-pill-warn";
  return "retest-pill retest-pill-danger";
}

export default function ActivityRow({ activity, projectId, indent = false, showBreadcrumb = false }: ActivityRowProps) {
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
        <Form.Check
          type="checkbox"
          aria-label={`Selecionar ${activity.name}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
      </td>
      <td style={indent ? { paddingLeft: 34 } : undefined}>
        <div className="fw-semibold">{activity.name}</div>
        {showBreadcrumb && (
          <div className="flat-breadcrumb">
            {activity.module} › {activity.process}
          </div>
        )}
      </td>
      <td className="font-monospace small">{activity.id}</td>
      <td>
        <ActivityStatusBadge status={activity.status} />
      </td>
      <td>
        <span className="avatar-mini">{getInitials(activity.tester)}</span>
        {activity.tester}
      </td>
      <td>
        <span className="avatar-mini">{getInitials(activity.dev)}</span>
        {activity.dev}
      </td>
      <td className="font-monospace small">{formatDate(activity.plannedStart)}</td>
      <td className={`font-monospace small${overdue ? " date-overdue" : ""}`}>
        {formatDate(activity.plannedEnd)}
        {overdue && <span className="overdue-tag">Atrasado</span>}
      </td>
      <td className="font-monospace small">{formatDate(activity.actualStart)}</td>
      <td className="font-monospace small">{formatDate(activity.actualEnd)}</td>
      <td className="small">{activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}</td>
      <td className="text-center">
        <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}×</span>
      </td>
      <td className="text-center">{activity.issueCount}</td>
    </tr>
  );
}
