import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import Modal from "../common/Modal";
import { projectsApi } from "../../api/resources/projects";
import { useMocks } from "../../config/env";
import { useParams } from "react-router";
import { useActivities } from "../../hooks/useActivities";

export default function ConfigAttachmentsPanel({ onSaved }: { onSaved: () => void }) {
  const { config, canManage, setConfig } = useProjectConfig();
  const { id: projectId = "" } = useParams();
  // Em modo real, o impacto vem de uma contagem no servidor, sem carregar a lista inteira.
  const { activities: mockActivities } = useActivities(useMocks ? projectId : "");
  const [draft, setDraft] = useState({
    anexoMaxMb: config.anexoMaxMb,
    evidenciaObrigatoriaAtividade: config.evidenciaObrigatoriaAtividade,
    evidenciaObrigatoriaIssue: config.evidenciaObrigatoriaIssue,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkingImpact, setCheckingImpact] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<number | null>(null);
  const validSize = Number.isInteger(draft.anexoMaxMb) && draft.anexoMaxMb >= 1;
  const activityChanged = draft.evidenciaObrigatoriaAtividade !== config.evidenciaObrigatoriaAtividade;
  const issueChanged = draft.evidenciaObrigatoriaIssue !== config.evidenciaObrigatoriaIssue;
  const sizeChanged = draft.anexoMaxMb !== config.anexoMaxMb;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({
      anexoMaxMb: config.anexoMaxMb,
      evidenciaObrigatoriaAtividade: config.evidenciaObrigatoriaAtividade,
      evidenciaObrigatoriaIssue: config.evidenciaObrigatoriaIssue,
    });
  }, [config]);

  async function requestSave() {
    if (!canManage || saving || checkingImpact || !validSize) return;
    if (!activityChanged && !issueChanged && !sizeChanged) return;
    setSaved(false);
    setSaveError(null);
    setCheckingImpact(true);
    try {
      const count = useMocks
        ? mockActivities.filter((activity) => activity.status !== "concluido" && activity.status !== "cancelado").length
        : await projectsApi.evidenceImpact(projectId);
      setPendingActivities(count);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível verificar o impacto da alteração. Tente novamente.");
    } finally {
      setCheckingImpact(false);
    }
  }

  async function handleSave() {
    if (!canManage || saving || !validSize) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await setConfig({ ...config, ...draft });
      setPendingActivities(null);
      setSaved(true);
      onSaved();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as regras.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Anexos e Evidências</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Limite aplicado a evidências de aprovação de atividade, anexos de issue e evidências de solução.
      </div>

      <div className="subhead">Tamanho máximo por arquivo</div>
      <fieldset className="config-edit-fields" disabled={!canManage || saving || checkingImpact || pendingActivities !== null} onChange={() => { setSaved(false); setSaveError(null); }}>
      <div className="field-value" style={{ width: "fit-content", marginBottom: 16 }}>
        <input
          type="number"
          min="1"
          value={draft.anexoMaxMb}
          aria-label="Tamanho máximo por arquivo, em megabytes"
          onChange={(event) => {
            setDraft((prev) => ({ ...prev, anexoMaxMb: Number(event.target.value) }));
          }}
        />{" "}
        MB
      </div>

      <div className="subhead">Evidência obrigatória</div>
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="toggle-pill">
          <span className="switch">
            <input
              type="checkbox"
              checked={draft.evidenciaObrigatoriaAtividade}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, evidenciaObrigatoriaAtividade: event.target.checked }));
              }}
            />
            <span className="track" />
          </span>
          Exigir evidência ao aprovar/concluir atividade
        </label>
        <label className="toggle-pill">
          <span className="switch">
            <input
              type="checkbox"
              checked={draft.evidenciaObrigatoriaIssue}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, evidenciaObrigatoriaIssue: event.target.checked }));
              }}
            />
            <span className="track" />
          </span>
          Exigir evidência em issue impeditiva
        </label>
      </div>

      </fieldset>
      {!validSize && <div className="error-banner" role="alert">Informe um limite inteiro de pelo menos 1 MB.</div>}
      {saveError && <div className="error-banner" role="alert">{saveError}</div>}
      {canManage && <div className="config-save-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={saving || checkingImpact || pendingActivities !== null || !validSize || (!activityChanged && !issueChanged && !sizeChanged)} onClick={requestSave}>
          {checkingImpact ? "Verificando impacto..." : saving ? "Salvando..." : "Salvar regras"}
        </button>
        {saved && <span className="config-save-success" role="status"><CircleCheck size={18} aria-hidden="true" />Edições Salvas</span>}
      </div>}
      <Modal open={pendingActivities !== null} onClose={() => { if (!saving) setPendingActivities(null); }} labelledBy="confirm-evidence-rules-title">
        <div className="config-evidence-confirmation">
        <div className="modal-title" id="confirm-evidence-rules-title">Alterar regras de evidência?</div>
        <p>Esta mudança vale para as próximas conclusões de atividades e aberturas de issues. Registros anteriores não serão alterados nem invalidados, e nenhum arquivo existente será removido.</p>
        <ul>
          {activityChanged && <li>Evidência na conclusão de atividades: {config.evidenciaObrigatoriaAtividade ? "obrigatória" : "opcional"} → {draft.evidenciaObrigatoriaAtividade ? "obrigatória" : "opcional"}.</li>}
          {issueChanged && <li>Anexo na abertura de issues impeditivas: {config.evidenciaObrigatoriaIssue ? "obrigatório" : "opcional"} → {draft.evidenciaObrigatoriaIssue ? "obrigatório" : "opcional"}.</li>}
          {sizeChanged && <li>Limite para novos arquivos: {config.anexoMaxMb} MB → {draft.anexoMaxMb} MB.</li>}
        </ul>
        {(activityChanged || sizeChanged) && <p><strong>{pendingActivities} atividade(s) pendente(s)</strong> ficarão sujeitas às novas regras nas próximas ações. Contagem no momento da consulta; concluídas e canceladas não entram.</p>}
        <p>Issues já abertas não terão cobrança retroativa de anexos. O anexo da solução continua opcional.</p>
        {saveError && <div className="error-banner" role="alert">{saveError}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" disabled={saving} onClick={() => setPendingActivities(null)}>Voltar</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "Salvando..." : "Confirmar alteração"}</button>
        </div>
        </div>
      </Modal>
    </div>
  );
}
