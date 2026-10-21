export const PROJECT_PERMISSIONS = [
  { key: "hierarchy_manage", label: "Configurar hierarquia e nomes dos níveis", tester: false, dev: false },
  { key: "activities_import", label: "Importar atividades em massa", tester: false, dev: false },
  { key: "activities_create", label: "Cadastrar atividade individual", tester: false, dev: false },
  { key: "activities_cancel", label: "Cancelar atividade", tester: false, dev: false },
  { key: "activities_edit", label: "Editar atividade", tester: false, dev: false },
  { key: "activities_assign", label: "Editar atribuições da atividade", tester: false, dev: false },
  { key: "project_edit", label: "Editar campos do projeto", tester: false, dev: false },
  { key: "config_thresholds", label: "Configurar limiares e análise automática", tester: false, dev: false },
  { key: "config_evidence", label: "Configurar anexos e evidências", tester: false, dev: false },
  { key: "activities_complete", label: "Aprovar atividade individual ou em lote", tester: true, dev: false },
  { key: "activities_block", label: "Bloquear atividade manualmente", tester: true, dev: false },
  { key: "issues_create", label: "Registrar issue", tester: true, dev: false },
  { key: "issues_analyze", label: "Analisar e propor solução para issue", tester: false, dev: true },
  { key: "issues_cancel", label: "Cancelar issue em análise", tester: false, dev: true },
  { key: "issues_resolve", label: "Concluir issue com solução proposta", tester: true, dev: false },
  { key: "data_view", label: "Visualizar atividades e issues", tester: true, dev: true },
  { key: "dashboard_view", label: "Visualizar painéis de indicadores", tester: true, dev: true },
  { key: "data_export", label: "Exportar listagens e auditoria", tester: true, dev: true },
] as const;

export type ProjectAction = typeof PROJECT_PERMISSIONS[number]["key"];
export type ProjectPermissionRole = "GESTOR" | "TESTER" | "DEV";
export type ProjectPermissionMatrix = Partial<Record<ProjectAction, Partial<Record<ProjectPermissionRole, boolean>>>>;

export const DEFAULT_PERMISSION_MATRIX: ProjectPermissionMatrix = Object.fromEntries(
  PROJECT_PERMISSIONS.map(row => [row.key, { GESTOR: true, TESTER: row.tester, DEV: row.dev }]),
);
