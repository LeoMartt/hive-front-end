import { useState } from "react";

interface PermissionRow {
  action: string;
  gestor: boolean;
  tester: boolean;
  dev: boolean;
}

const PERMISSION_ROWS: PermissionRow[] = [
  { action: "Criar / editar atividades", gestor: true, tester: false, dev: false },
  { action: "Importar atividades em massa", gestor: true, tester: false, dev: false },
  { action: "Aprovar atividade", gestor: true, tester: true, dev: false },
  { action: "Cancelar atividade", gestor: true, tester: false, dev: false },
  { action: "Registrar issue", gestor: true, tester: true, dev: true },
  { action: "Iniciar análise da issue", gestor: true, tester: false, dev: true },
  { action: "Propor solução da issue", gestor: true, tester: false, dev: true },
  { action: "Exportar dados (atividades/issues)", gestor: true, tester: true, dev: true },
  { action: "Editar limiares e alertas", gestor: true, tester: false, dev: false },
  { action: "Convidar usuário", gestor: true, tester: false, dev: false },
];

type PermissionRole = "gestor" | "tester" | "dev";

export default function ConfigPermissionMatrix() {
  const [rows, setRows] = useState<PermissionRow[]>(PERMISSION_ROWS);
  const [saved, setSaved] = useState(false);

  function toggleCell(action: string, role: PermissionRole) {
    setRows((prev) =>
      prev.map((row) => (row.action === action ? { ...row, [role]: !row[role] } : row))
    );
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Matriz de Permissões por Papel</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Referência para quando a diferenciação por papel for reativada. Hoje todas as ações estão disponíveis a
        qualquer papel — esta matriz não é aplicada de verdade ainda.
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ação</th>
              <th style={{ textAlign: "center" }}>Gestor</th>
              <th style={{ textAlign: "center" }}>Tester</th>
              <th style={{ textAlign: "center" }}>Dev</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.gestor}
                    onChange={() => toggleCell(row.action, "gestor")}
                    aria-label={`${row.action} — Gestor`}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.tester}
                    onChange={() => toggleCell(row.action, "tester")}
                    aria-label={`${row.action} — Tester`}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.dev}
                    onChange={() => toggleCell(row.action, "dev")}
                    aria-label={`${row.action} — Dev`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleSave}>
        Salvar matriz
      </button>
      {saved && (
        <span className="saved-msg" style={{ marginLeft: 10 }}>
          Matriz salva ✓
        </span>
      )}
    </div>
  );
}
