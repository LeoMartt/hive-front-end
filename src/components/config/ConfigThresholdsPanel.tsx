import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { useProjects } from "../../hooks/useProjects";
import type { AgingThresholds, ProjectConfig } from "../../types/projectConfig";

interface ConfigThresholdsPanelProps {
  projectId: string;
  onSaved: () => void;
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

export default function ConfigThresholdsPanel({ projectId, onSaved }: ConfigThresholdsPanelProps) {
  const { config, canManage, setConfig } = useProjectConfig();
  const { projects } = useProjects();
  const currentProject = projects.find((item) => item.id === projectId);
  const [draft, setDraft] = useState<ProjectConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(config);
  }, [config]);

  const agingMode = currentProject?.mode === "cutover" ? "cutover" : "uat";
  const agingKey: keyof Pick<ProjectConfig, "agingUat" | "agingCutover"> =
    agingMode === "uat" ? "agingUat" : "agingCutover";
  const editingAging = draft[agingKey];
  const canSave = isValidConfig(draft);

  function updateDraft(partial: Partial<ProjectConfig>) {
    setSaved(false);
    setSaveError(null);
    setDraft((prev) => ({ ...prev, ...partial }));
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

  // Mescla só os 4 campos que este painel edita, em vez de substituir o ProjectConfig
  // inteiro — o `draft` é tirado de um snapshot no mount e nunca resincroniza com mudanças
  // externas, então um setConfig(draft) bruto reverteria silenciosamente qualquer campo
  // salvo por outro painel montado ao lado (ex.: evidenciaObrigatoriaIssue em
  // ConfigAttachmentsPanel) enquanto este ainda estivesse aberto na mesma sessão.
  async function handleSave() {
    if (!canManage || !canSave || saving) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await setConfig({
        ...config,
        spiSaudavel: draft.spiSaudavel,
        spiCritico: draft.spiCritico,
        agingUat: draft.agingUat,
        agingCutover: draft.agingCutover,
      });
      setSaved(true);
      onSaved();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar os limiares.");
    } finally {
      setSaving(false);
    }
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
      <fieldset className="config-edit-fields" disabled={!canManage || saving}>
      <div className="field-row" style={{ marginBottom: 16 }}>
        <div className="field">
          <div className="field-label">SPI saudável a partir de</div>
          <div className="field-value">
            <input
              type="number"
              aria-label="SPI saudável a partir de"
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
              aria-label="SPI crítico abaixo de"
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
      <div className="config-transition-row">
        <label className="toggle-pill">
          <span className="switch">
            <input type="checkbox" checked={false} disabled readOnly />
            <span className="track" />
          </span>
          {"Issue - 'aberta' -> 'em análise' automaticamente"}
        </label>
      </div>

      <div className="subhead">Aging de issues abertas</div>
      <div className="field-row" style={{ marginBottom: 10 }}>
        <div className="field">
          <div className="field-label">Em alerta a partir de</div>
          <div className="field-value">
            <input
              type="number"
              aria-label="Em alerta a partir de"
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
              aria-label="Em risco a partir de"
              min="0"
              value={editingAging.risco}
              onChange={(event) => updateAging({ risco: Number(event.target.value) })}
            />{" "}
            dias
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "inherit", marginBottom: 14 }}>
        Editando os limiares salvos neste projeto.
      </div>

      {!canSave && (
        <div className="error-banner">
          Limiares inválidos: os valores devem estar entre 0 e 1 (SPI), o crítico não pode ser maior que o saudável,
          e "em risco" não pode ser menor que "em alerta".
        </div>
      )}
      </fieldset>
      {saveError && <div className="error-banner" role="alert">{saveError}</div>}
      {canManage && <div className="config-save-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? "Salvando..." : "Salvar limiares"}
        </button>
        {saved && <span className="config-save-success" role="status"><CircleCheck size={18} aria-hidden="true" />Edições Salvas</span>}
      </div>}
    </div>
  );
}
