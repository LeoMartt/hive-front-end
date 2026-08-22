import { useState } from "react";
import Modal from "../common/Modal";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { NewActivityInput } from "../../types/activity";
import type { TeamMember } from "../../types/project";

interface NewActivityModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  onCreate: (input: NewActivityInput) => void;
}

interface NewActivityFormState {
  name: string;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string;
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string;
  errorMsg: string | null;
}

function createEmptyState(): NewActivityFormState {
  return {
    name: "",
    module: "",
    process: "",
    tester: "",
    dev: "",
    plannedStart: "",
    plannedEnd: "",
    predecessors: "",
    wbs: "",
    area: "",
    system: "",
    transaction: "",
    expectedResult: "",
    notes: "",
    errorMsg: null,
  };
}

// <input type="date"> devolve "YYYY-MM-DD" — passar direto pra `new Date(...)` é
// interpretado como UTC-midnight e pode exibir o dia anterior em UTC-3 (mesma classe
// de bug já corrigida em isOverdue/toLocalIsoString, ver activityIndicators.ts).
function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return toLocalIsoString(new Date(year, month - 1, day));
}

type RequiredFieldKey = "name" | "module" | "process" | "tester" | "dev" | "plannedStart" | "plannedEnd";

const REQUIRED_FIELDS: { key: RequiredFieldKey; label: string }[] = [
  { key: "name", label: "Nome da atividade" },
  { key: "module", label: "Módulo" },
  { key: "process", label: "Processo" },
  { key: "tester", label: "Tester" },
  { key: "dev", label: "Desenvolvedor" },
  { key: "plannedStart", label: "Início planejado" },
  { key: "plannedEnd", label: "Conclusão planejada" },
];

export default function NewActivityModal({ show, onHide, team, onCreate }: NewActivityModalProps) {
  const [state, setState] = useState<NewActivityFormState>(createEmptyState);

  function resetAndHide() {
    setState(createEmptyState());
    onHide();
  }

  function updateField<K extends keyof NewActivityFormState>(key: K, value: NewActivityFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    const missing = REQUIRED_FIELDS.filter(({ key }) => !state[key].trim()).map(({ label }) => label);
    if (missing.length > 0) {
      setState((prev) => ({ ...prev, errorMsg: `Preencha os campos obrigatórios: ${missing.join(", ")}.` }));
      return;
    }

    onCreate({
      name: state.name.trim(),
      module: state.module.trim(),
      process: state.process.trim(),
      tester: state.tester,
      dev: state.dev,
      plannedStart: dateInputToIso(state.plannedStart),
      plannedEnd: dateInputToIso(state.plannedEnd),
      predecessors: state.predecessors
        .split(";")
        .map((id) => id.trim())
        .filter(Boolean),
      wbs: state.wbs.trim(),
      area: state.area.trim(),
      system: state.system.trim(),
      transaction: state.transaction.trim(),
      expectedResult: state.expectedResult.trim(),
      notes: state.notes.trim() || null,
    });
    resetAndHide();
  }

  const testers = team.filter((member) => member.role === "Tester");
  const devs = team.filter((member) => member.role === "Desenvolvedor");

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="new-activity-modal-title">
      <div className="modal-title" id="new-activity-modal-title">
        Nova atividade
      </div>
      <div className="modal-subtitle">
        Preencha os dados abaixo para incluir uma atividade em um módulo e processo existentes.
      </div>

      {state.errorMsg && <div className="error-banner">{state.errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-name">
          Nome da atividade
        </label>
        <input
          className="form-input"
          type="text"
          id="new-activity-name"
          placeholder="Ex: Validar cálculo de crédito ICMS"
          value={state.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-module">
            Módulo
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-module"
            placeholder="Ex: Fiscal"
            value={state.module}
            onChange={(event) => updateField("module", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-process">
            Processo
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-process"
            placeholder="Ex: Apuração de ICMS"
            value={state.process}
            onChange={(event) => updateField("process", event.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-tester">
            Tester
          </label>
          <select
            className="form-input"
            id="new-activity-tester"
            aria-label="Tester"
            value={state.tester}
            onChange={(event) => updateField("tester", event.target.value)}
          >
            {testers.length === 0 ? (
              <option value="" disabled>
                Nenhum tester cadastrado no projeto
              </option>
            ) : (
              <>
                <option value="">Selecione…</option>
                {testers.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-dev">
            Desenvolvedor
          </label>
          <select
            className="form-input"
            id="new-activity-dev"
            aria-label="Desenvolvedor"
            value={state.dev}
            onChange={(event) => updateField("dev", event.target.value)}
          >
            {devs.length === 0 ? (
              <option value="" disabled>
                Nenhum dev cadastrado no projeto
              </option>
            ) : (
              <>
                <option value="">Selecione…</option>
                {devs.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-inicio">
            Início planejado
          </label>
          <input
            className="form-input"
            type="date"
            id="new-activity-inicio"
            value={state.plannedStart}
            onChange={(event) => updateField("plannedStart", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-fim">
            Conclusão planejada
          </label>
          <input
            className="form-input"
            type="date"
            id="new-activity-fim"
            value={state.plannedEnd}
            onChange={(event) => updateField("plannedEnd", event.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-predecessores">
          Predecessores <span className="optional">(opcional — IDs separados por ";")</span>
        </label>
        <input
          className="form-input"
          type="text"
          id="new-activity-predecessores"
          placeholder="Ex: ATV-1042; ATV-1050"
          value={state.predecessors}
          onChange={(event) => updateField("predecessors", event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-wbs">
            WBS <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-wbs"
            placeholder="Ex: 1.2.3"
            value={state.wbs}
            onChange={(event) => updateField("wbs", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-area">
            Área <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-area"
            placeholder="Ex: Fiscal"
            value={state.area}
            onChange={(event) => updateField("area", event.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-sistema">
            Sistema <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-sistema"
            placeholder="Ex: SAP ECC"
            value={state.system}
            onChange={(event) => updateField("system", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-transacao">
            Transação <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-transacao"
            placeholder="Ex: FB60"
            value={state.transaction}
            onChange={(event) => updateField("transaction", event.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-resultado">
          Resultado esperado <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="new-activity-resultado"
          placeholder="O que deve acontecer quando o teste for bem-sucedido"
          value={state.expectedResult}
          onChange={(event) => updateField("expectedResult", event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-observacoes">
          Observações <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="new-activity-observacoes"
          placeholder="Informações adicionais sobre a atividade"
          value={state.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Criar atividade
        </button>
      </div>
    </Modal>
  );
}
