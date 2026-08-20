export default function ConfigAttachmentsPanel() {
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
        <input type="number" min="1" defaultValue={10} /> MB
      </div>

      <div className="subhead">Evidência obrigatória</div>
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="toggle-pill">
          <span className="switch">
            <input type="checkbox" defaultChecked />
            <span className="track" />
          </span>
          Exigir evidência ao aprovar/concluir atividade
        </label>
        <label className="toggle-pill">
          <span className="switch">
            <input type="checkbox" defaultChecked />
            <span className="track" />
          </span>
          Exigir evidência em issue impeditiva
        </label>
      </div>

      <button type="button" className="btn btn-primary btn-sm">
        Salvar limite
      </button>
    </div>
  );
}
