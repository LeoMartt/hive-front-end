import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { parseActivityImportRows, downloadActivityImportTemplate } from "../../utils/activityImport";
import type { NewActivityInput } from "../../types/activity";
import type { TeamMember } from "../../types/project";

interface ImportActivitiesModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  onImport: (inputs: NewActivityInput[]) => void;
}

interface ImportResult {
  success: boolean;
  summary: string;
  errors: string[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isAcceptedExtension(fileName: string): boolean {
  return /\.(xlsx|xls)$/i.test(fileName);
}

export default function ImportActivitiesModal({ show, onHide, team, onImport }: ImportActivitiesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setSelectedFile(null);
    setDragOver(false);
    setResult(null);
    setImporting(false);
    onHide();
  }

  function handleFileSelected(file: File) {
    if (!isAcceptedExtension(file.name)) {
      setSelectedFile(null);
      setResult({ success: false, summary: "Formato de arquivo não suportado. Envie um .xlsx ou .xls.", errors: [] });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setResult({ success: false, summary: "Arquivo muito grande (máximo 5MB).", errors: [] });
      return;
    }
    setSelectedFile(file);
    setResult(null);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
        defval: "",
      });
      const { valid, errors } = parseActivityImportRows(rows, team);

      if (valid.length > 0) {
        onImport(valid);
      }

      setResult({
        success: errors.length === 0,
        summary: `${valid.length} atividade(s) importada(s) com sucesso.`,
        errors,
      });
      setSelectedFile(null);
    } catch {
      setResult({
        success: false,
        summary: "Não foi possível ler o arquivo. Confirme se é um .xlsx válido, seguindo o modelo.",
        errors: [],
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="import-activities-modal-title">
      <div className="modal-title" id="import-activities-modal-title">
        Importar atividades em massa
      </div>
      <div className="modal-subtitle">
        Envie a planilha (.xlsx) com a carga de atividades. Predecessores devem referenciar IDs já existentes no
        sistema (ex: ATV-1042).
      </div>

      <button type="button" className="btn btn-sm" style={{ marginBottom: 14 }} onClick={downloadActivityImportTemplate}>
        <NavIcon>
          <path d="M12 3v12m0 0-4-4m4 4 4-4" />
          <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </NavIcon>
        Baixar modelo (.xlsx)
      </button>

      <details className="import-ref">
        <summary>Ver descrição dos campos da carga</summary>
        <div className="import-ref-list">
          <div>
            <b>Nome</b> — nome da atividade (obrigatório).
          </div>
          <div>
            <b>Módulo</b> — nível 1 da hierarquia (obrigatório).
          </div>
          <div>
            <b>Processo</b> — nível 2 da hierarquia, dentro do módulo (obrigatório).
          </div>
          <div>
            <b>Tester</b> — precisa bater com um nome do time do projeto com papel Tester (obrigatório).
          </div>
          <div>
            <b>Desenvolvedor</b> — precisa bater com um nome do time do projeto com papel Desenvolvedor (obrigatório).
          </div>
          <div>
            <b>Início Planejado</b> — data planejada de início (DD/MM/AAAA ou célula de data do Excel).
          </div>
          <div>
            <b>Conclusão Planejada</b> — data planejada de conclusão (DD/MM/AAAA ou célula de data do Excel).
          </div>
          <div>
            <b>Predecessores</b> — IDs de atividades já existentes das quais esta depende, separados por ";"
            (opcional; ex.: ATV-1042; ATV-1050).
          </div>
          <div>
            <b>WBS</b> — código da estrutura analítica do projeto (opcional).
          </div>
          <div>
            <b>Área</b> — área de negócio envolvida (opcional).
          </div>
          <div>
            <b>Sistema</b> — sistema onde o teste é executado (opcional).
          </div>
          <div>
            <b>Transação</b> — transação/código específico do sistema (opcional).
          </div>
          <div>
            <b>Resultado Esperado</b> — o que deve acontecer quando o teste for bem-sucedido (opcional).
          </div>
          <div>
            <b>Observações</b> — informações adicionais sobre a atividade (opcional).
          </div>
        </div>
      </details>

      <div className="form-group">
        <label className="form-label" htmlFor="import-activities-file-input">
          Arquivo da carga
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
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
            if (file) handleFileSelected(file);
          }}
        >
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          <span>
            {selectedFile
              ? `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)`
              : "Clique ou arraste o arquivo .xlsx da carga"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          id="import-activities-file-input"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelected(file);
            event.target.value = "";
          }}
        />
      </div>

      {result && (
        <div className={`import-result-banner show${result.success ? " success" : ""}`}>
          <div>{result.summary}</div>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary modal-submit"
        disabled={!selectedFile || importing}
        onClick={handleImport}
      >
        {importing ? "Importando…" : "Importar atividades"}
      </button>
    </Modal>
  );
}
