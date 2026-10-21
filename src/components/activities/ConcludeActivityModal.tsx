import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { buildEvidenceMetadata, formatEvidenceFileSize, getEvidenceFileError } from "../../utils/evidenceFiles";
import type { ConcludeActivityInput } from "../../types/activity";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { normalizeError } from "../../api/apiError";

interface ConcludeActivityModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ConcludeActivityInput) => void | Promise<void>;
  title?: string;
  subtitle?: string;
}

export default function ConcludeActivityModal({
  show,
  onHide,
  currentUserName,
  onSubmit,
  title = "Concluir atividade",
  subtitle,
}: ConcludeActivityModalProps) {
  const { config, ready } = useProjectConfig();
  const evidenceRequired = config.evidenciaObrigatoriaAtividade;
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setText("");
    setSelectedFile(null);
    setDragOver(false);
    setErrorMsg(null);
    onHide();
  }

  function selectFile(file: File) {
    const error = getEvidenceFileError(file, config.anexoMaxMb);
    if (error) {
      setSelectedFile(null);
      setErrorMsg(error);
      return;
    }
    setSelectedFile(file);
    setErrorMsg(null);
  }

  async function handleConfirm() {
    if (submitting || !ready) return;
    if (evidenceRequired && !selectedFile) {
      setErrorMsg("Anexe a evidência antes de confirmar.");
      return;
    }

    const fileError = selectedFile ? getEvidenceFileError(selectedFile, config.anexoMaxMb) : null;
    if (fileError) { setErrorMsg(fileError); return; }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        approvalNote: text.trim() ? text.trim() : null,
        approvalEvidence: selectedFile ? buildEvidenceMetadata(selectedFile, currentUserName) : null,
      });
      resetAndHide();
    } catch (error) {
      setErrorMsg(normalizeError(error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={show} onClose={() => { if (!submitting) resetAndHide(); }} labelledBy="conclude-activity-modal-title">
      <div className="modal-title" id="conclude-activity-modal-title">
        {title}
      </div>
      {subtitle && <div className="modal-subtitle">{subtitle}</div>}

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="conclude-activity-text">
          Observação de aprovação <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="conclude-activity-text"
          placeholder="Ex.: Cenário executado conforme o resultado esperado, sem divergências."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" id="conclude-activity-file-label">
          Evidência <span className="optional">({!ready ? "verificando configuração" : evidenceRequired ? "obrigatória" : "opcional"})</span>
        </label>
        <div className="modal-subtitle" aria-live="polite">
          {!ready
            ? "Verificando a configuração de evidências do projeto."
            : evidenceRequired
              ? "Neste projeto, é obrigatório anexar evidência para concluir atividades conforme Papéis & Config."
              : "Neste projeto, é possível concluir atividades sem evidência conforme Papéis & Config."}
        </div>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-labelledby="conclude-activity-file-label"
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
            if (file) {
              selectFile(file);
            }
          }}
        >
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          <span>
            {selectedFile
              ? `${selectedFile.name} (${formatEvidenceFileSize(selectedFile.size)})`
              : `Clique ou arraste o arquivo de evidência${ready ? ` (máx. ${config.anexoMaxMb} MB)` : ""}`}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.log"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              selectFile(file);
            }
            event.target.value = "";
          }}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" disabled={submitting} onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting || !ready} onClick={handleConfirm}>
          {submitting ? "Concluindo..." : "Concluir atividade"}
        </button>
      </div>
    </Modal>
  );
}
