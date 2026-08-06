export type ProjectMode = "uat" | "cutover";

export type UserRole = "Gestor de Projetos" | "Tester" | "Desenvolvedor";

export interface TeamMember {
  initials: string;
  name: string;
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
