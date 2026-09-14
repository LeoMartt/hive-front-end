import { useEffect, useState } from "react";
import { useProjectConfig } from "../../context/ProjectConfigContext";

export default function ConfigAttachmentsPanel() {
  const { config, setConfig } = useProjectConfig();
  const [draft, setDraft] = useState({
    anexoMaxMb: config.anexoMaxMb,
    evidenciaObrigatoriaAtividade: config.evidenciaObrigatoriaAtividade,
    evidenciaObrigatoriaIssue: config.evidenciaObrigatoriaIssue,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft({
      anexoMaxMb: config.anexoMaxMb,
      evidenciaObrigatoriaAtividade: config.evidenciaObrigatoriaAtividade,
      evidenciaObrigatoriaIssue: config.evidenciaObrigatoriaIssue,
    });
    setSaved(false);
  }, [config]);

  function handleSave() {
    setConfig({ ...config, ...draft });
    setSaved(true);
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
      <div className="field-value" style={{ width: "fit-content", marginBottom: 16 }}>
        <input
          type="number"
          min="1"
          value={draft.anexoMaxMb}
          aria-label="Tamanho máximo por arquivo, em megabytes"
          onChange={(event) => {
            setDraft((prev) => ({ ...prev, anexoMaxMb: Number(event.target.value) }));
            setSaved(false);
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
                setSaved(false);
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
                setSaved(false);
              }}
            />
            <span className="track" />
          </span>
          Exigir evidência em issue impeditiva
        </label>
      </div>

      <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
        Salvar limite
      </button>
      {saved && <span className="saved-msg">Limite atualizado ✓</span>}
    </div>
  );
}
