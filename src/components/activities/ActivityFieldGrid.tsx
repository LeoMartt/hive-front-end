import { formatActivityDate } from "../../utils/activityIndicators";
import type { Activity } from "../../types/activity";

interface ActivityFieldGridProps {
  activity: Activity;
}

export default function ActivityFieldGrid({ activity }: ActivityFieldGridProps) {
  return (
    <div className="field-row">
      <div className="field">
        <div className="field-label">Tester</div>
        <div className="field-value">{activity.tester}</div>
      </div>
      <div className="field">
        <div className="field-label">Desenvolvedor</div>
        <div className="field-value">{activity.dev}</div>
      </div>

      <div className="field">
        <div className="field-label">Início planejado</div>
        <div className="field-value mono">{formatActivityDate(activity.plannedStart)}</div>
      </div>
      <div className="field">
        <div className="field-label">Conclusão planejada</div>
        <div className="field-value mono">{formatActivityDate(activity.plannedEnd)}</div>
      </div>

      <div className="field">
        <div className="field-label">Início real</div>
        <div className="field-value mono">{formatActivityDate(activity.actualStart)}</div>
      </div>
      <div className="field">
        <div className="field-label">Conclusão real</div>
        <div className="field-value mono">{formatActivityDate(activity.actualEnd)}</div>
      </div>

      <div className="field">
        <div className="field-label">Predecessores</div>
        <div className="field-value mono">
          {activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}
        </div>
      </div>
      <div className="field">
        <div className="field-label">WBS</div>
        <div className="field-value mono">{activity.wbs || "—"}</div>
      </div>

      <div className="field">
        <div className="field-label">Área</div>
        <div className="field-value">{activity.area || "—"}</div>
      </div>
      <div className="field">
        <div className="field-label">Sistema</div>
        <div className="field-value">{activity.system || "—"}</div>
      </div>

      <div className="field">
        <div className="field-label">Transação</div>
        <div className="field-value mono">{activity.transaction || "—"}</div>
      </div>
      <div className="field">
        <div className="field-label">Nº de reteste</div>
        <div className="field-value mono">{activity.retestCount}×</div>
      </div>

      <div className="field full">
        <div className="field-label">Resultado esperado</div>
        <div className="field-value big">{activity.expectedResult || "—"}</div>
      </div>
      <div className="field full">
        <div className="field-label">Observações</div>
        <div className="field-value big">{activity.notes ?? "—"}</div>
      </div>

      {activity.status !== "aguardando" && (
        <>
          <div className="field">
            <div className="field-label">Evidência de aprovação</div>
            {activity.approvalEvidence ? (
              <div className="evidence-file">
                <span className="attach-icon">{activity.approvalEvidence.fileName.split(".").pop()?.toUpperCase()}</span>
                {activity.approvalEvidence.fileName}
              </div>
            ) : activity.status === "concluido" ? (
              <div className="field-value">Nenhuma evidência anexada com a aprovação.</div>
            ) : (
              <div className="field-value pending">— pendente</div>
            )}
          </div>
          <div className="field">
            <div className="field-label">Observação de aprovação</div>
            {activity.approvalNote ? (
              <div className="field-value">{activity.approvalNote}</div>
            ) : activity.status === "concluido" ? (
              <div className="field-value">Nenhuma observação registrada na aprovação.</div>
            ) : (
              <div className="field-value pending">— pendente</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
