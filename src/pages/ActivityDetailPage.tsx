import { useNavigate, useParams } from "react-router";
import ActivityStatusBadge from "../components/activities/ActivityStatusBadge";
import ActivityFieldGrid from "../components/activities/ActivityFieldGrid";
import ActivityAuditTrail from "../components/activities/ActivityAuditTrail";
import ActivityLinkedIssuesPanel from "../components/activities/ActivityLinkedIssuesPanel";
import { useActivities } from "../hooks/useActivities";
import { retestPillClass } from "../utils/activityIndicators";
import { deriveActivityAuditTrail } from "../utils/activityAuditTrail";

export default function ActivityDetailPage() {
  const { id, activityId } = useParams();
  const projectId = id ?? "";
  const navigate = useNavigate();
  const { activities } = useActivities(projectId);
  const activity = activities.find((item) => item.id === activityId);

  function goBack() {
    navigate(`/projetos/${projectId}/atividades`);
  }

  if (!activity) {
    return (
      <div className="empty-state">
        <div className="empty-title">Atividade não encontrada</div>
        <div className="empty-desc">
          Não encontramos a atividade <b>{activityId}</b> neste projeto.
        </div>
      </div>
    );
  }

  const showActions = activity.status !== "concluido" && activity.status !== "cancelado";
  const auditEntries = deriveActivityAuditTrail(activity);

  return (
    <div>
      <button type="button" className="btn btn-sm" onClick={goBack} style={{ marginBottom: 10 }}>
        ← Voltar para Atividades
      </button>

      <div className="activity-layout">
        <div className="panel activity-main">
          <div className="drawer-id">
            {activity.id} · {activity.module} / {activity.process}
          </div>
          <div className="page-title" style={{ marginBottom: 10 }}>
            {activity.name}
          </div>
          <div style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActivityStatusBadge status={activity.status} />
            <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}× reteste</span>
          </div>

          {showActions && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                Concluir atividade
              </button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }}>
                Rejeitar atividade
              </button>
            </div>
          )}

          <ActivityFieldGrid activity={activity} />
          <ActivityAuditTrail entries={auditEntries} />
        </div>

        <div className="activity-side">
          <ActivityLinkedIssuesPanel activityId={activity.id} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
