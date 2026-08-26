import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { ProposeSolutionInput } from "../../types/issue";

interface ProposeSolutionModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ProposeSolutionInput) => void;
}

function formatFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function ProposeSolutionModal({ show, onHide, currentUserName, onSubmit }: ProposeSolutionModalProps) {
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
    if (!text.trim()) {
      setErrorMsg("Preencha a solução proposta antes de continuar.");
      return;
    }

    onSubmit({
      proposedSolution: text.trim(),
      solutionAttachment: selectedFile
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

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="propose-solution-modal-title">
      <div className="modal-title" id="propose-solution-modal-title">
        Propor solução
      </div>
      <div className="modal-subtitle">
        Descreva o que foi feito para resolver o problema, ou a orientação a seguir. A evidência é opcional.
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="propose-solution-text">
          Solução proposta
        </label>
        <textarea
          className="form-textarea"
          id="propose-solution-text"
          placeholder="Ex.: Ajustada a regra de determinação de alíquota no cadastro fiscal do fornecedor…"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setErrorMsg(null);
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label" id="propose-solution-file-label">
          Evidência <span className="optional">(opcional)</span>
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-labelledby="propose-solution-file-label"
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
            {selectedFile
              ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
              : "Clique ou arraste um print/arquivo (opcional)"}
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

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Propor solução
        </button>
      </div>
    </Modal>
  );
}
