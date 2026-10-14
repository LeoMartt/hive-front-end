interface PermissionRow {
  action: string;
  gestor: boolean;
  tester: boolean;
  dev: boolean;
}

const PERMISSION_ROWS: PermissionRow[] = [
  { action: "Criar projeto", gestor: true, tester: false, dev: false },
  { action: "Configurar hierarquia e nomes dos níveis", gestor: true, tester: false, dev: false },
  { action: "Importar atividades em massa", gestor: true, tester: false, dev: false },
  { action: "Cadastrar atividade individual", gestor: true, tester: false, dev: false },
  { action: "Cancelar atividade", gestor: true, tester: false, dev: false },
  { action: "Editar atividade", gestor: true, tester: false, dev: false },
  { action: "Editar atribuições", gestor: true, tester: false, dev: false },
  { action: "Editar campos do projeto", gestor: true, tester: false, dev: false },
  { action: "Configurar limiares de alerta do SPI", gestor: true, tester: false, dev: false },
  { action: "Iniciar execução de atividade", gestor: true, tester: true, dev: false },
  { action: "Aprovar atividade individual ou em lote", gestor: true, tester: true, dev: false },
  { action: "Anexar evidência", gestor: true, tester: true, dev: false },
  { action: "Registrar issue", gestor: true, tester: true, dev: false },
  { action: "Analisar e propor solução para issue", gestor: true, tester: false, dev: true },
  { action: "Visualizar atividades e issues", gestor: true, tester: true, dev: true },
  { action: "Visualizar painéis de indicadores", gestor: true, tester: true, dev: true },
];

export default function ConfigPermissionMatrix() {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Matriz de Permissões por Papel</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Referência das permissões atuais. A edição desta matriz será definida depois com o time.
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
                  <input
                    type="checkbox"
                    checked={row.gestor}
                    disabled
                    readOnly
                    aria-label={`${row.action} — Gestor`}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.tester}
                    disabled
                    readOnly
                    aria-label={`${row.action} — Tester`}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.dev}
                    disabled
                    readOnly
                    aria-label={`${row.action} — Dev`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
