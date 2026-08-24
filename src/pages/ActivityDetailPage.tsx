import { useState } from "react";
import { useParams } from "react-router";
import ActivityStatusBadge from "../components/activities/ActivityStatusBadge";
import ActivityFieldGrid from "../components/activities/ActivityFieldGrid";
import ActivityAuditTrail from "../components/activities/ActivityAuditTrail";
import ActivityLinkedIssuesPanel from "../components/activities/ActivityLinkedIssuesPanel";
import ActivityAttachmentsPanel from "../components/activities/ActivityAttachmentsPanel";
import ActivityPredecessorPanel from "../components/activities/ActivityPredecessorPanel";
import RegisterIssueModal from "../components/issues/RegisterIssueModal";
import { useActivities } from "../hooks/useActivities";
import { useIssues } from "../hooks/useIssues";
import { useProjects } from "../hooks/useProjects";
import { useGoBack } from "../hooks/useGoBack";
import { retestPillClass } from "../utils/activityIndicators";
import { deriveActivityAuditTrail } from "../utils/activityAuditTrail";

const CURRENT_USER_NAME = "Guilherme Fabretti";

export default function ActivityDetailPage() {
  const { id, activityId } = useParams();
  const projectId = id ?? "";
  const { activities } = useActivities(projectId);
  const { issues, createIssue } = useIssues(projectId);
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);
  const activity = activities.find((item) => item.id === activityId);
  const goBack = useGoBack(`/projetos/${projectId}/atividades`);
  const [showRegisterIssueModal, setShowRegisterIssueModal] = useState(false);

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

  const auditEntries = deriveActivityAuditTrail(activity);

  // Calculado independente do status — usado tanto pro painel "Predecessor" (só quando
  // aguardando) quanto pelos anexos herdados (só quando bloqueado, ver
  // ActivityAttachmentsPanel).
  const predecessorActivity =
    activity.predecessors.length > 0 ? (activities.find((item) => item.id === activity.predecessors[0]) ?? null) : null;
  const showPredecessorPanel = activity.status === "aguardando" && predecessorActivity !== null;

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
            {activity.retestCount > 0 && (
              <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}× reteste</span>
            )}
          </div>

          {showPredecessorPanel && predecessorActivity && (
            <div className="info-banner">
              ⏳ Aguardando conclusão do predecessor <b>{predecessorActivity.id}</b> para liberar o início desta
              atividade.
            </div>
          )}
          {activity.status === "concluido" && (
            <div className="info-banner">✅ Atividade concluída. Nenhuma ação pendente.</div>
          )}

          {activity.status === "bloqueado" && (
            <button
              type="button"
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
              onClick={() => setShowRegisterIssueModal(true)}
            >
              Registrar nova issue
            </button>
          )}
          {(activity.status === "execucao" || activity.status === "liberado") && (
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
          {showPredecessorPanel && predecessorActivity ? (
            <ActivityPredecessorPanel predecessor={predecessorActivity} projectId={projectId} />
          ) : (
            <>
              <ActivityLinkedIssuesPanel activityId={activity.id} projectId={projectId} issues={issues} />
              <ActivityAttachmentsPanel activity={activity} predecessor={predecessorActivity} />
            </>
          )}
        </div>
      </div>

      <RegisterIssueModal
        show={showRegisterIssueModal}
        onHide={() => setShowRegisterIssueModal(false)}
        team={currentProject?.team ?? []}
        activities={activities}
        currentActivity={activity}
        currentUserName={CURRENT_USER_NAME}
        onCreate={createIssue}
      />
    </div>
  );
}
