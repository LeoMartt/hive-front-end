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

export default function ConfigPermissionMatrix() {
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
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={row.gestor} aria-label={`${row.action} — Gestor`} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={row.tester} aria-label={`${row.action} — Tester`} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={row.dev} aria-label={`${row.action} — Dev`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
        Salvar matriz
      </button>
    </div>
  );
}
