import type { ProjectPermissionMatrix } from "./projectPermissions";

export interface AgingThresholds {
  alerta: number;
  risco: number;
}

export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
  anexoMaxMb: number;
  evidenciaObrigatoriaAtividade: boolean;
  evidenciaObrigatoriaIssue: boolean;
  issueAutoAnalysis: boolean;
  permissionMatrix: ProjectPermissionMatrix;
}
