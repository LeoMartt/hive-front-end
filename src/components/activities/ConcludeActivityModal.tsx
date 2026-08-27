import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { ConcludeActivityInput } from "../../types/activity";

interface ConcludeActivityModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ConcludeActivityInput) => void;
  title?: string;
  subtitle?: string;
}

function formatFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function ConcludeActivityModal({
  show,
  onHide,
  currentUserName,
  onSubmit,
  title = "Concluir atividade",
  subtitle = "Anexe a evidência de aprovação. A observação é opcional.",
}: ConcludeActivityModalProps) {
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

  function handleConfirm() {
    if (!selectedFile) {
      setErrorMsg("Anexe a evidência antes de confirmar.");
      return;
    }

    onSubmit({
      approvalNote: text.trim() ? text.trim() : null,
      approvalEvidence: {
        fileName: selectedFile.name,
        sizeLabel: formatFileSize(selectedFile.size),
        uploadedBy: currentUserName,
        uploadedAt: toLocalIsoString(new Date()),
      },
    });
    resetAndHide();
  }

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="conclude-activity-modal-title">
      <div className="modal-title" id="conclude-activity-modal-title">
        {title}
      </div>
      <div className="modal-subtitle">{subtitle}</div>

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
          Evidência
        </label>
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
              setSelectedFile(file);
              setErrorMsg(null);
            }
          }}
        >
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          <span>
            {selectedFile
              ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
              : "Clique ou arraste o arquivo de evidência"}
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
              setSelectedFile(file);
              setErrorMsg(null);
            }
            event.target.value = "";
          }}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Concluir atividade
        </button>
      </div>
    </Modal>
  );
}
