import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { toLocalIsoString } from "../../utils/activityIndicators";
import { ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS } from "../../utils/issueIndicators";
import type { IssueType, IssueImpact, NewIssueInput } from "../../types/issue";
import type { Activity } from "../../types/activity";
import type { TeamMember } from "../../types/project";

interface RegisterIssueModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  activities: Activity[];
  currentActivity?: Activity;
  currentUserName: string;
  submitLabel?: string;
  title?: string;
  onCreate: (input: NewIssueInput) => void;
}

interface RegisterIssueFormState {
  relatedActivityId: string;
  title: string;
  description: string;
  type: IssueType;
  impeditiva: boolean;
  impact: IssueImpact;
  impactNote: string;
  dev: string;
  errorMsg: string | null;
}

function createEmptyState(): RegisterIssueFormState {
  return {
    relatedActivityId: "",
    title: "",
    description: "",
    type: "requisito",
    impeditiva: false,
    impact: "medio",
    impactNote: "",
    dev: "",
    errorMsg: null,
  };
}

const ISSUE_TYPE_OPTIONS: IssueType[] = [
  "requisito",
  "performance",
  "dados",
  "integracao",
  "interface",
  "configuracao",
  "outro",
];

const ISSUE_IMPACT_OPTIONS: IssueImpact[] = ["muito_alto", "alto", "medio", "baixo"];

function formatFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function RegisterIssueModal({
  show,
  onHide,
  team,
  activities,
  currentActivity,
  currentUserName,
  submitLabel,
  title,
  onCreate,
}: RegisterIssueModalProps) {
  const { config } = useProjectConfig();
  const [state, setState] = useState<RegisterIssueFormState>(createEmptyState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setState(createEmptyState());
    setSelectedFile(null);
    setDragOver(false);
    onHide();
  }

  function updateField<K extends keyof RegisterIssueFormState>(key: K, value: RegisterIssueFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    const missing: string[] = [];
    if (!state.title.trim()) missing.push("Título da issue");
    if (!state.description.trim()) missing.push("Descrição da issue");
    if (!currentActivity && !state.relatedActivityId) missing.push("Atividade vinculada");
    if (!state.dev) missing.push("Desenvolvedor responsável");
    if (state.impeditiva && config.evidenciaObrigatoriaIssue && !selectedFile) {
      missing.push("Anexo (evidência obrigatória para issues impeditivas)");
    }
    if (missing.length > 0) {
      setState((prev) => ({ ...prev, errorMsg: `Preencha os campos obrigatórios: ${missing.join(", ")}.` }));
      return;
    }

    const linkedActivity = currentActivity ?? activities.find((activity) => activity.id === state.relatedActivityId);

    onCreate({
      title: state.title.trim(),
      description: state.description.trim(),
      type: state.type,
      impeditiva: state.impeditiva,
      impact: state.impact,
      impactNote: state.impactNote.trim(),
      tester: currentUserName,
      dev: state.dev,
      area: linkedActivity?.area ?? "",
      relatedActivityId: linkedActivity?.id ?? "",
      openingAttachment: selectedFile
        ? {
            fileName: selectedFile.name,
            sizeLabel: formatFileSize(selectedFile.size),
            uploadedBy: currentUserName,
            uploadedAt: toLocalIsoString(new Date()),
          }
        : null,
    });
    resetAndHide();
  }

  const devs = team.filter((member) => member.role === "Desenvolvedor");

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="register-issue-modal-title">
      <div className="modal-title" id="register-issue-modal-title">
        {title ?? "Registrar issue"}
      </div>

      {state.errorMsg && <div className="error-banner">{state.errorMsg}</div>}

      {!currentActivity && (
        <div className="form-group">
          <label className="form-label" htmlFor="register-issue-activity">
            Atividade vinculada
          </label>
          <select
            className="form-input"
            id="register-issue-activity"
            value={state.relatedActivityId}
            onChange={(event) => updateField("relatedActivityId", event.target.value)}
          >
            <option value="">Selecione…</option>
            {[...activities]
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.id} — {activity.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-title">
          Título da issue
        </label>
        <input
          className="form-input"
          type="text"
          id="register-issue-title"
          placeholder="Ex.: Alíquota incorreta na NF-e"
          value={state.title}
          onChange={(event) => updateField("title", event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-description">
          Descrição da issue
        </label>
        <textarea
          className="form-textarea"
          id="register-issue-description"
          placeholder="Descreva o problema encontrado"
          value={state.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="register-issue-type">
            Tipo
          </label>
          <select
            className="form-input"
            id="register-issue-type"
            value={state.type}
            onChange={(event) => updateField("type", event.target.value as IssueType)}
          >
            {ISSUE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {ISSUE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-issue-impeditivo">
            Impeditivo
          </label>
          <select
            className="form-input"
            id="register-issue-impeditivo"
            value={state.impeditiva ? "sim" : "nao"}
            onChange={(event) => updateField("impeditiva", event.target.value === "sim")}
          >
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-impact">
          Categorização de impacto
        </label>
        <select
          className="form-input"
          id="register-issue-impact"
          value={state.impact}
          onChange={(event) => updateField("impact", event.target.value as IssueImpact)}
        >
          {ISSUE_IMPACT_OPTIONS.map((impact) => (
            <option key={impact} value={impact}>
              {ISSUE_IMPACT_LABELS[impact]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-impact-note">
          Nota de impacto <span className="optional">(opcional)</span>
        </label>
        <input
          className="form-input"
          type="text"
          id="register-issue-impact-note"
          placeholder="Ex: interrompe a remessa de pagamentos aos fornecedores"
          value={state.impactNote}
          onChange={(event) => updateField("impactNote", event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" id="register-issue-file-label">
          Anexo
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-labelledby="register-issue-file-label"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file) setSelectedFile(file);
          }}
        >
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          <span>
            {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "Clique ou arraste um arquivo"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.log"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setSelectedFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-dev">
          Desenvolvedor responsável
        </label>
        <select
          className="form-input"
          id="register-issue-dev"
          aria-label="Desenvolvedor responsável"
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

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          {submitLabel ?? "Criar"}
        </button>
      </div>
    </Modal>
  );
}
