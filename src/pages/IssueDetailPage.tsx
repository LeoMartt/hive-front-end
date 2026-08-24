import { useState } from "react";
import { useParams } from "react-router";
import IssueStatusBadge from "../components/issues/IssueStatusBadge";
import IssueFieldGrid from "../components/issues/IssueFieldGrid";
import IssueAuditTrail from "../components/issues/IssueAuditTrail";
import IssueAttachmentsPanel from "../components/issues/IssueAttachmentsPanel";
import ProposeSolutionModal from "../components/issues/ProposeSolutionModal";
import { useIssues } from "../hooks/useIssues";
import { useActivities } from "../hooks/useActivities";
import { useGoBack } from "../hooks/useGoBack";
import { deriveIssueAuditTrail } from "../utils/issueAuditTrail";

const CURRENT_USER_NAME = "Guilherme Fabretti";

export default function IssueDetailPage() {
  const { id, issueId } = useParams();
  const projectId = id ?? "";
  const { issues, startAnalysis, proposeSolution } = useIssues(projectId);
  const { activities } = useActivities(projectId);
  const issue = issues.find((item) => item.id === issueId);
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

  const relatedActivity =
    issue.relatedActivityId !== null ? (activities.find((item) => item.id === issue.relatedActivityId) ?? null) : null;
  const auditEntries = deriveIssueAuditTrail(issue);

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

          {issue.status === "aberta" && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
              onClick={() => startAnalysis(issue.id)}
            >
              Iniciar análise
            </button>
          )}
          {issue.status === "em_analise" && (
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
        </div>

        <div className="activity-side">
          <IssueAttachmentsPanel issue={issue} />
        </div>
      </div>

      <ProposeSolutionModal
        show={showProposeSolutionModal}
        onHide={() => setShowProposeSolutionModal(false)}
        currentUserName={CURRENT_USER_NAME}
        onSubmit={(input) => proposeSolution(issue.id, input)}
      />
    </div>
  );
}
