import { formatActivityDate } from "../../utils/activityIndicators";
import { computeIssueAgingDays, ISSUE_IMPACT_LABELS, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import type { Issue } from "../../types/issue";

interface IssueFieldGridProps {
  issue: Issue;
}

export default function IssueFieldGrid({ issue }: IssueFieldGridProps) {
  const aging = computeIssueAgingDays(issue);

  return (
    <div className="field-row">
      <div className="field">
        <div className="field-label">Tipo</div>
        <div className="field-value">{ISSUE_TYPE_LABELS[issue.type]}</div>
      </div>
      <div className="field">
        <div className="field-label">Desenvolvedor responsável</div>
        <div className="field-value">{issue.dev}</div>
      </div>

      <div className="field">
        <div className="field-label">Aberta em</div>
        <div className="field-value mono">{formatActivityDate(issue.openedAt)}</div>
      </div>
      {issue.status === "concluida" ? (
        <div className="field">
          <div className="field-label">Concluída em</div>
          <div className="field-value mono">
            {formatActivityDate(issue.resolvedAt)} ({aging} dias)
          </div>
        </div>
      ) : (
        <div className="field">
          <div className="field-label">Aberta há</div>
          <div className="field-value">{aging} dias</div>
        </div>
      )}

      <div className="field">
        <div className="field-label">Atividade vinculada</div>
        <div className="field-value mono">{issue.relatedActivityId ?? "—"}</div>
      </div>
      <div className="field">
        <div className="field-label">Categorização de impacto</div>
        <div className="field-value">
          {ISSUE_IMPACT_LABELS[issue.impact]}
          {issue.impactNote && ` — ${issue.impactNote}`}
        </div>
      </div>

      <div className="field full">
        <div className="field-label">Descrição</div>
        <div className="field-value big">{issue.description}</div>
      </div>
      <div className="field full">
        <div className="field-label">Solução proposta</div>
        {issue.proposedSolution ? (
          <div className="field-value big">{issue.proposedSolution}</div>
        ) : (
          <div className="field-value pending">
            {issue.status === "aberta" ? "— ainda não analisada" : "— ainda não proposta"}
          </div>
        )}
      </div>
    </div>
  );
}
