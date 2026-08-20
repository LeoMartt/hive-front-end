import { useState } from "react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import type { AgingThresholds, ProjectConfig } from "../../types/projectConfig";

type AgingMode = "uat" | "cutover";

export default function ConfigThresholdsPanel() {
  const { config, setConfig } = useProjectConfig();
  const [draft, setDraft] = useState<ProjectConfig>(config);
  const [agingMode, setAgingMode] = useState<AgingMode>("uat");
  const [autoTransition, setAutoTransition] = useState(false);
  const [saved, setSaved] = useState(false);

  const agingKey: keyof Pick<ProjectConfig, "agingUat" | "agingCutover"> =
    agingMode === "uat" ? "agingUat" : "agingCutover";
  const editingAging = draft[agingKey];

  function updateDraft(partial: Partial<ProjectConfig>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  }

  // Não usa uma chave computada (`{ [agingKey]: ... }`) para escrever — TypeScript não
  // consegue estreitar o tipo do objeto resultante para Partial<ProjectConfig> nesse caso
  // (só a leitura via chave computada, draft[agingKey] acima, é segura). Um if/else com
  // chaves literais em cada ramo evita o problema.
  function updateAging(partial: Partial<AgingThresholds>) {
    if (agingMode === "uat") {
      updateDraft({ agingUat: { ...draft.agingUat, ...partial } });
    } else {
      updateDraft({ agingCutover: { ...draft.agingCutover, ...partial } });
    }
  }

  function handleSave() {
    setConfig(draft);
    setSaved(true);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Limiares e Alertas</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Definem a partir de quando o SPI e as issues em aberto passam a ser sinalizados visualmente como risco.
        Editável pelo Gestor de Projetos.
      </div>

      <div className="subhead">SPI do projeto</div>
      <div className="field-row" style={{ marginBottom: 16 }}>
        <div className="field">
          <div className="field-label">SPI saudável a partir de</div>
          <div className="field-value">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={draft.spiSaudavel}
              onChange={(event) => updateDraft({ spiSaudavel: Number(event.target.value) })}
            />{" "}
            (verde)
          </div>
        </div>
        <div className="field">
          <div className="field-label">SPI crítico abaixo de</div>
          <div className="field-value">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={draft.spiCritico}
              onChange={(event) => updateDraft({ spiCritico: Number(event.target.value) })}
            />{" "}
            (vermelho)
          </div>
        </div>
      </div>

      <div className="subhead">Transições automáticas</div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>Issue: Aberta → Em análise</span>
        <label className="toggle-pill">
          <span className="switch">
            <input
              type="checkbox"
              checked={autoTransition}
              onChange={(event) => setAutoTransition(event.target.checked)}
            />
            <span className="track" />
          </span>
          {autoTransition ? "Automática ao abrir a issue" : 'Manual — o Dev aciona "Iniciar análise"'}
        </label>
      </div>

      <div className="subhead">Aging de issues abertas</div>
      <div className="filters" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`filter-pill${agingMode === "uat" ? " active" : ""}`}
          onClick={() => setAgingMode("uat")}
        >
          UAT
        </button>
        <button
          type="button"
          className={`filter-pill${agingMode === "cutover" ? " active" : ""}`}
          onClick={() => setAgingMode("cutover")}
        >
          Cutover
        </button>
      </div>
      <div className="field-row" style={{ marginBottom: 10 }}>
        <div className="field">
          <div className="field-label">Em alerta a partir de</div>
          <div className="field-value">
            <input
              type="number"
              min="0"
              value={editingAging.alerta}
              onChange={(event) => updateAging({ alerta: Number(event.target.value) })}
            />{" "}
            dias
          </div>
        </div>
        <div className="field">
          <div className="field-label">Em risco a partir de</div>
          <div className="field-value">
            <input
              type="number"
              min="0"
              value={editingAging.risco}
              onChange={(event) => updateAging({ risco: Number(event.target.value) })}
            />{" "}
            dias
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "inherit", marginBottom: 14 }}>
        Editando limiares do modo {agingMode === "uat" ? "UAT" : "Cutover"}.
      </div>

      <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
        Salvar limiares
      </button>
      {saved && <span className="saved-msg">Limiares atualizados ✓</span>}
    </div>
  );
}
