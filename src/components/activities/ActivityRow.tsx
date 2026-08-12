import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { isOverdue } from "../../utils/activityIndicators";
import type { Activity } from "../../types/activity";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

export default function ActivityRow({ activity, projectId }: ActivityRowProps) {
  const navigate = useNavigate();
  const overdue = isOverdue(activity);

  function goToDetail() {
    navigate(`/projetos/${projectId}/atividades/${activity.id}`);
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
      <td>
        <div className="fw-semibold">{activity.name}</div>
        <div className="text-body-secondary small font-monospace">{activity.id}</div>
      </td>
      <td>
        <ActivityStatusBadge status={activity.status} />
      </td>
      <td>{activity.tester}</td>
      <td>{activity.dev}</td>
      <td className="font-monospace small">
        {formatDate(activity.plannedStart)} → {formatDate(activity.plannedEnd)}
        {overdue && <span className="badge bg-danger ms-1">Atrasado</span>}
      </td>
      <td className="font-monospace small">
        {formatDate(activity.actualStart)} → {formatDate(activity.actualEnd)}
      </td>
      <td className="small">{activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}</td>
      <td className="text-center">{activity.retestCount}</td>
      <td className="text-center">{activity.issueCount}</td>
    </tr>
  );
}
