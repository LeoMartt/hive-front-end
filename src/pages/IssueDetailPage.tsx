import { useState } from "react";
import { useParams } from "react-router";
import IssueStatusBadge from "../components/issues/IssueStatusBadge";
import IssueFieldGrid from "../components/issues/IssueFieldGrid";
import IssueAuditTrail from "../components/issues/IssueAuditTrail";
import IssueAttachmentsPanel from "../components/issues/IssueAttachmentsPanel";
import ProposeSolutionModal from "../components/issues/ProposeSolutionModal";
import { useIssues } from "../hooks/useIssues";
import { useActivities } from "../hooks/useActivities";
import { useProjects } from "../hooks/useProjects";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useGoBack } from "../hooks/useGoBack";
import { deriveIssueAuditTrail } from "../utils/issueAuditTrail";

export default function IssueDetailPage() {
  const { id, issueId } = useParams();
  const projectId = id ?? "";
  const { issues, startAnalysis, proposeSolution, cancelIssue } = useIssues(projectId);
  const { activities } = useActivities(projectId);
  const { projects } = useProjects();
  const { name: currentUserName, email: currentUserEmail, id: currentUserId } = useCurrentUser();
  const issue = issues.find((item) => item.id === issueId);
  const currentProject = projects.find((project) => project.id === projectId);
  const goBack = useGoBack(`/projetos/${projectId}/issues`);
  const [showProposeSolutionModal, setShowProposeSolutionModal] = useState(false);

  if (!issue) {
    return (
      <div className="empty-state">
        <div className="empty-title">Issue não encontrada</div>
        <div className="empty-desc">
          Não encontramos a issue <b>{issueId}</b> neste projeto.
        </div>
      </div>
    );
  }

  const relatedActivity = activities.find((item) => item.id === issue.relatedActivityId) ?? null;
  const auditEntries = deriveIssueAuditTrail(issue);
  const currentMember = currentProject?.team.find(
    (member) =>
      member.id === currentUserId ||
      (currentUserEmail !== undefined && member.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
      member.name === currentUserName,
  );
  const isGestor = currentMember?.role === "Gestor de Projetos";
  const isIssueDev =
    issue.developerId === currentUserId ||
    issue.developerId === currentMember?.id ||
    issue.dev === currentUserName ||
    issue.dev === currentUserEmail;
  const canStartAnalysis = issue.status === "aberta" && isIssueDev;
  const canProposeSolution = issue.status === "em_analise" && isIssueDev;
  const canCancelIssue = issue.status === "em_analise" && (isIssueDev || isGestor);

  return (
    <div>
      <button type="button" className="btn btn-sm" onClick={goBack} style={{ marginBottom: 10 }}>
        ← Voltar
      </button>

      <div className="activity-layout">
        <div className="panel activity-main">
          <div className="drawer-id">
            {issue.id}
            {relatedActivity && ` · vinculada a ${relatedActivity.name}`}
          </div>
          <div className="page-title" style={{ marginBottom: 10 }}>
            {issue.title}
          </div>
          <div style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <IssueStatusBadge status={issue.status} />
            <span className={`impeditivo-tag ${issue.impeditiva ? "impeditivo-tag-sim" : "impeditivo-tag-nao"}`}>
              {issue.impeditiva ? "Impeditiva" : "Não impeditiva"}
            </span>
          </div>

          {issue.status === "solucao_proposta" && (
            <div className="info-banner">
              Aguardando reteste da atividade vinculada — a issue é concluída automaticamente quando a atividade for
              aprovada.
            </div>
          )}

          {canStartAnalysis && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
              onClick={() => startAnalysis(issue.id)}
            >
              Iniciar análise
            </button>
          )}
          {canProposeSolution && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
              onClick={() => setShowProposeSolutionModal(true)}
            >
              Propor solução
            </button>
          )}

          <IssueFieldGrid issue={issue} />
          <IssueAuditTrail entries={auditEntries} />
          {canCancelIssue && (
            <button
              type="button"
              className="btn btn-danger"
              style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
              onClick={() => cancelIssue(issue.id)}
            >
              Cancelar issue
            </button>
          )}
        </div>

        <div className="activity-side">
          <IssueAttachmentsPanel issue={issue} />
        </div>
      </div>

      <ProposeSolutionModal
        show={showProposeSolutionModal}
        onHide={() => setShowProposeSolutionModal(false)}
        currentUserName={currentUserName}
        onSubmit={(input) => proposeSolution(issue.id, input)}
      />
    </div>
  );
}
