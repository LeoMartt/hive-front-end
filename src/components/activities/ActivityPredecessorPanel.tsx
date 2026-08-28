import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { formatActivityDate } from "../../utils/activityIndicators";
import { deriveActivityAuditTrail } from "../../utils/activityAuditTrail";
import Avatar from "../common/Avatar";
import type { Activity } from "../../types/activity";

interface ActivityPredecessorPanelProps {
  predecessor: Activity;
  projectId: string;
}

// Só aparece no lugar do painel "Issues vinculadas" quando a atividade está aguardando
// esse predecessor — mostra um resumo dele em vez de issues, que ainda não existem
// pra uma atividade que nem começou.
export default function ActivityPredecessorPanel({ predecessor, projectId }: ActivityPredecessorPanelProps) {
  const navigate = useNavigate();
  const auditEntries = deriveActivityAuditTrail(predecessor).slice(0, 2);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Predecessor</div>
      </div>
      <div className="drawer-id">{predecessor.id}</div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{predecessor.name}</div>
      <div style={{ marginBottom: 14 }}>
        <ActivityStatusBadge status={predecessor.status} />
      </div>
      <div className="field-row" style={{ marginBottom: 16 }}>
        <div className="field">
          <div className="field-label">Tester</div>
          <div className="field-value">
            <Avatar name={predecessor.tester} className="avatar-mini" alt="" />
            {predecessor.tester}
          </div>
        </div>
        <div className="field">
          <div className="field-label">Desenvolvedor</div>
          <div className="field-value">
            <Avatar name={predecessor.dev} className="avatar-mini" alt="" />
            {predecessor.dev}
          </div>
        </div>
        <div className="field full">
          <div className="field-label">Conclusão planejada</div>
          <div className="field-value mono">{formatActivityDate(predecessor.plannedEnd)}</div>
        </div>
      </div>
      <div className="subhead">Trilha de auditoria</div>
      <div className="audit-trail" style={{ marginBottom: 16 }}>
        {auditEntries.map((entry, index) => (
          <div key={index}>
            <span className="mono audit-trail-at">{new Date(entry.at).toLocaleString("pt-BR")}</span> — {entry.text}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-sm"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={() => navigate(`/projetos/${projectId}/atividades/${predecessor.id}`)}
      >
        Ver atividade {predecessor.id}
      </button>
    </div>
  );
}
