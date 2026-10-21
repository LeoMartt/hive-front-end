import { useState } from "react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import Modal from "../common/Modal";
import FormCombobox from "../common/FormCombobox";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { NewActivityInput } from "../../types/activity";
import type { HierarchyNode, ProjectMode, TeamMember } from "../../types/project";

interface NewActivityModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  hierarchyNodes: HierarchyNode[];
  projectMode: ProjectMode | null;
  onCreate: (input: NewActivityInput) => void;
}

interface NewActivityFormState {
  name: string;
  moduleNodeId: string;
  moduleName: string;
  processNodeId: string;
  processName: string;
  testerId: string;
  developerId: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string;
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
    moduleNodeId: "",
    moduleName: "",
    processNodeId: "",
    processName: "",
    testerId: "",
    developerId: "",
    plannedStart: "",
    plannedEnd: "",
    predecessors: "",
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

export default function NewActivityModal({
  show,
  onHide,
  team,
  hierarchyNodes,
  projectMode,
  onCreate,
}: NewActivityModalProps) {
  const { config, ready } = useProjectConfig();
  const [state, setState] = useState<NewActivityFormState>(createEmptyState);

  function resetAndHide() {
    setState(createEmptyState());
    onHide();
  }

  function updateField<K extends keyof NewActivityFormState>(key: K, value: NewActivityFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    const selectedModule = hierarchyNodes.find((node) => node.id === state.moduleNodeId) ?? null;
    const selectedProcess = hierarchyNodes.find((node) => node.id === state.processNodeId) ?? null;
    const moduleName = (selectedModule?.name ?? state.moduleName).trim();
    const processName = (selectedProcess?.name ?? state.processName).trim();
    const selectedTester = team.find((member) => member.id === state.testerId) ?? null;
    const selectedDeveloper = team.find((member) => member.id === state.developerId) ?? null;
    const selectedNode = projectMode === "cutover" ? selectedModule : selectedProcess;

    const missing: string[] = [];
    if (!state.name.trim()) missing.push("Nome da atividade");
    if (!moduleName) missing.push("Módulo");
    if (projectMode === "uat" && !processName) missing.push("Processo");
    if (!selectedTester?.id) missing.push("Tester");
    if (!selectedDeveloper?.id) missing.push("Desenvolvedor");
    if (!state.plannedStart.trim()) missing.push("Início planejado");
    if (!state.plannedEnd.trim()) missing.push("Conclusão planejada");

    if (missing.length > 0) {
      setState((prev) => ({ ...prev, errorMsg: `Preencha os campos obrigatórios: ${missing.join(", ")}.` }));
      return;
    }
    if (state.plannedStart > state.plannedEnd) {
      setState((prev) => ({
        ...prev,
        errorMsg: "A conclusão planejada não pode ser anterior ao início planejado.",
      }));
      return;
    }

    onCreate({
      name: state.name.trim(),
      nodeId: selectedNode?.id,
      module: moduleName,
      process: projectMode === "cutover" ? "" : processName,
      testerId: selectedTester?.id,
      tester: selectedTester?.name ?? "",
      developerId: selectedDeveloper?.id,
      dev: selectedDeveloper?.name ?? "",
      plannedStart: dateInputToIso(state.plannedStart),
      plannedEnd: dateInputToIso(state.plannedEnd),
      predecessors: state.predecessors
        .split(";")
        .map((id) => id.trim())
        .filter(Boolean),
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
  const modules = hierarchyNodes.filter((node) => node.level === 1);
  const matchedModule =
    modules.find((node) => node.id === state.moduleNodeId) ??
    modules.find((node) => node.name.toLowerCase() === state.moduleName.trim().toLowerCase()) ??
    null;
  const processes = hierarchyNodes.filter((node) => node.level === 2 && node.parentId === matchedModule?.id);

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="new-activity-modal-title">
      <div className="modal-title" id="new-activity-modal-title">
        Nova atividade
      </div>

      <div className="modal-subtitle">
        {!ready
          ? "Verificando a configuração de evidências do projeto."
          : config.evidenciaObrigatoriaAtividade
            ? "Não é necessário anexar evidência na criação. Neste projeto, ela será obrigatória na conclusão, conforme Papéis & Config."
            : "Não é necessário anexar evidência na criação. Neste projeto, ela também é opcional na conclusão, conforme Papéis & Config."}
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
          <FormCombobox
            id="new-activity-module"
            allowCustom
            options={modules.map((node) => ({ value: node.name, label: node.name }))}
            placeholder="Selecione ou digite"
            value={state.moduleName}
            onChange={(value) => {
              const match = modules.find((node) => node.name.toLowerCase() === value.trim().toLowerCase());
              updateField("moduleName", value);
              updateField("moduleNodeId", match?.id ?? "");
              updateField("processNodeId", "");
              updateField("processName", "");
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-process">
            Processo
          </label>
          <FormCombobox
            id="new-activity-process"
            allowCustom
            options={processes.map((node) => ({ value: node.name, label: node.name }))}
            placeholder={projectMode === "cutover" ? "Não se aplica" : "Selecione ou digite"}
            value={projectMode === "cutover" ? "" : state.processName}
            onChange={(value) => {
              const match = processes.find((node) => node.name.toLowerCase() === value.trim().toLowerCase());
              updateField("processName", value);
              updateField("processNodeId", match?.id ?? "");
            }}
            disabled={projectMode === "cutover" || !state.moduleName.trim()}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-tester">
            Tester
          </label>
          <FormCombobox
            id="new-activity-tester"
            value={state.testerId}
            onChange={(value) => updateField("testerId", value)}
            options={testers.filter((member) => member.id).map((member) => ({ value: member.id!, label: member.name }))}
            placeholder={testers.length ? "Selecione…" : "Nenhum tester cadastrado"}
            disabled={!testers.length}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-dev">
            Desenvolvedor
          </label>
          <FormCombobox
            id="new-activity-dev"
            value={state.developerId}
            onChange={(value) => updateField("developerId", value)}
            options={devs.filter((member) => member.id).map((member) => ({ value: member.id!, label: member.name }))}
            placeholder={devs.length ? "Selecione…" : "Nenhum desenvolvedor cadastrado"}
            disabled={!devs.length}
          />
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
            maxLength={1000}
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
