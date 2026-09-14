export type ProjectMode = "uat" | "cutover";
export type UserRole = "Gestor de Projetos" | "Tester" | "Desenvolvedor";
export interface TeamMember {
  membershipId?: string;
  id?: string;
  initials: string;
  name: string;
  email?: string;
  role: UserRole;
}
export interface Project {
  id: string;
  name: string;
  mode: ProjectMode;
  activityCount: number;
  completedCount: number;
  hierarchyLevels: string[];
  progressPercent: number;
  spi: number | null;
  team: TeamMember[];
  updatedAt: string;
  description?: string;
  agingAlertaDias?: number;
  agingRiscoDias?: number;
  spiSaudavel?: number;
  spiCritico?: number;
  anexoMaxMb?: number;
  exigirEvidenciaAtividade?: boolean;
  exigirEvidenciaIssue?: boolean;
}
export interface ProjectStats {
  total: number;
  uatCount: number;
  cutoverCount: number;
  avgSpi: number | null;
}
export interface NewProjectInput {
  name: string;
  description: string;
  mode: ProjectMode;
  hierarchyLevels: string[];
  team: TeamMember[];
}

export interface HierarchyNode {
  id: string;
  parentId: string | null;
  level: 1 | 2;
  name: string;
  order: number | null;
  createdAt: string;
}
