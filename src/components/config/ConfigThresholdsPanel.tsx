import { useState } from "react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { useProjects } from "../../hooks/useProjects";
import type { AgingThresholds, ProjectConfig } from "../../types/projectConfig";

type AgingMode = "uat" | "cutover";

interface ConfigThresholdsPanelProps {
  projectId: string;
}

function isValidAging(aging: AgingThresholds): boolean {
  return aging.alerta >= 0 && aging.risco >= aging.alerta;
}

// Números digitados livremente (vazio -> 0, negativo, "em risco" <= "em alerta") não são
// barrados pelos atributos min/max do <input> — esses só afetam as setas do navegador, não
// o que o usuário digita. Sem essa validação, salvar um valor ruim aqui recoloriria o SPI
// do Dashboard e o aging de Issues de outras telas já prontas de forma quebrada (ex.:
// limiar negativo faz toda issue aberta aparecer "em risco" instantaneamente).
function isValidConfig(config: ProjectConfig): boolean {
  return (
    config.spiSaudavel >= 0 &&
    config.spiSaudavel <= 1 &&
    config.spiCritico >= 0 &&
    config.spiCritico <= 1 &&
    config.spiCritico <= config.spiSaudavel &&
    isValidAging(config.agingUat) &&
    isValidAging(config.agingCutover)
  );
}

export default function ConfigThresholdsPanel({ projectId }: ConfigThresholdsPanelProps) {
  const { config, setConfig } = useProjectConfig();
  const { projects } = useProjects();
  const currentProject = projects.find((item) => item.id === projectId);
  const [draft, setDraft] = useState<ProjectConfig>(config);
  // Abre já na sub-aba do modo do projeto atual — evita que o Gestor edite "UAT" achando
  // que está mudando os limiares do projeto que está vendo quando ele é, na verdade,
  // Cutover. Ainda é só o ponto de partida: as duas sub-abas continuam editáveis.
  const [agingMode, setAgingMode] = useState<AgingMode>(currentProject?.mode === "cutover" ? "cutover" : "uat");
  const [autoTransition, setAutoTransition] = useState(false);
  const [saved, setSaved] = useState(false);

  const agingKey: keyof Pick<ProjectConfig, "agingUat" | "agingCutover"> =
    agingMode === "uat" ? "agingUat" : "agingCutover";
  const editingAging = draft[agingKey];
  const canSave = isValidConfig(draft);

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
    if (!canSave) return;
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
        Editando limiares do modo {agingMode === "uat" ? "UAT" : "Cutover"}
        {currentProject && agingMode !== currentProject.mode && " (diferente do modo deste projeto)"}.
      </div>

      {!canSave && (
        <div className="error-banner">
          Limiares inválidos: os valores devem estar entre 0 e 1 (SPI), o crítico não pode ser maior que o saudável,
          e "em risco" não pode ser menor que "em alerta".
        </div>
      )}
      <button type="button" className="btn btn-primary btn-sm" disabled={!canSave} onClick={handleSave}>
        Salvar limiares
      </button>
      {saved && <span className="saved-msg">Limiares atualizados ✓</span>}
    </div>
  );
}
