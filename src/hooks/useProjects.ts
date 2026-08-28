import { useEffect, useMemo, useState } from "react";
import type { NewProjectInput, Project, ProjectStats, TeamMember, UserRole } from "../types/project";
import { getInitials } from "../utils/initials";
import { useMocks } from "../config/env";
import { projectsApi } from "../api/resources/projects";
import { ApiError, normalizeError } from "../api/apiError";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const CURRENT_USER_TEAM_MEMBER = {
  initials: "GF",
  name: "Guilherme Fabretti",
  role: "Gestor de Projetos" as const,
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: "erp-migration",
    name: "ERP Migration — Rollout Fase 2",
    mode: "cutover",
    activityCount: 32,
    completedCount: 25,
    hierarchyLevels: ["Módulo"],
    progressPercent: 78,
    spi: 0.62,
    team: [
      { initials: "VC", name: "Vinícius Calefo Assarice", role: "Gestor de Projetos" },
      { initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" },
      { initials: "RL", name: "R. Lima", role: "Tester" },
      { initials: "JP", name: "J. Prado", role: "Desenvolvedor" },
    ],
    updatedAt: minutesAgo(12),
  },
  {
    id: "crm-homologacao",
    name: "CRM Homologação Comercial",
    mode: "uat",
    activityCount: 58,
    completedCount: 26,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 45,
    spi: 0.79,
    team: [
      { initials: "GF", name: "Guilherme Fabretti", role: "Gestor de Projetos" },
      { initials: "RS", name: "Rafael Souza", role: "Tester" },
    ],
    updatedAt: minutesAgo(40),
  },
  {
    id: "portal-rh",
    name: "Portal RH — Onboarding Digital",
    mode: "uat",
    activityCount: 19,
    completedCount: 17,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 92,
    spi: 0.95,
    team: [{ initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" }],
    updatedAt: minutesAgo(3),
  },
  {
    id: "faturamento-b2b",
    name: "Plataforma Faturamento B2B",
    mode: "uat",
    activityCount: 44,
    completedCount: 13,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 30,
    spi: 0.51,
    team: [
      { initials: "VC", name: "Vinícius Calefo Assarice", role: "Gestor de Projetos" },
      { initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" },
      { initials: "CP", name: "C. Prado", role: "Tester" },
      { initials: "MT", name: "M. Torres", role: "Desenvolvedor" },
    ],
    updatedAt: minutesAgo(60),
  },
  {
    id: "app-mobile-aprovacoes",
    name: "App Mobile — Aprovações",
    mode: "uat",
    activityCount: 27,
    completedCount: 16,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 60,
    spi: 0.83,
    team: [
      { initials: "RS", name: "Rafael Souza", role: "Tester" },
      { initials: "GF", name: "Guilherme Fabretti", role: "Gestor de Projetos" },
    ],
    updatedAt: minutesAgo(120),
  },
  {
    id: "integracao-logistica-sul",
    name: "Integração Logística Sul",
    mode: "cutover",
    activityCount: 21,
    completedCount: 21,
    hierarchyLevels: ["Módulo"],
    progressPercent: 100,
    spi: 1.0,
    team: [
      { initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" },
      { initials: "VC", name: "Vinícius Calefo Assarice", role: "Gestor de Projetos" },
    ],
    updatedAt: minutesAgo(60 * 24),
  },
];

interface UseProjectsResult {
  projects: Project[];
  stats: ProjectStats;
  loading: boolean;
  error: ApiError | null;
  createProject: (input: NewProjectInput) => void;
  addTeamMember: (projectId: string, member: TeamMember) => void;
  replaceTeamMemberRoles: (projectId: string, memberName: string, roles: UserRole[]) => void;
}

export function useProjects(): UseProjectsResult {
  // useMocks === true: seed local, síncrono. useMocks === false: busca na API.
  const [projects, setProjects] = useState<Project[]>(useMocks ? INITIAL_PROJECTS : []);
  const [loading, setLoading] = useState<boolean>(!useMocks);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (useMocks) return;
    // loading já inicia em !useMocks (true aqui) e error em null; o efeito roda uma
    // única vez (deps []), então não é preciso resetar estado antes do fetch.
    let cancelled = false;
    projectsApi
      .list()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : normalizeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo<ProjectStats>(() => {
    const total = projects.length;
    const uatCount = projects.filter((p) => p.mode === "uat").length;
    const cutoverCount = total - uatCount;
    const spiValues = projects
      .map((p) => p.spi)
      .filter((spi): spi is number => spi !== null);
    const avgSpi =
      spiValues.length === 0
        ? null
        : spiValues.reduce((sum, value) => sum + value, 0) / spiValues.length;
    return { total, uatCount, cutoverCount, avgSpi };
  }, [projects]);

  function createProject(input: NewProjectInput): void {
    const team = input.team.length > 0 ? input.team : [CURRENT_USER_TEAM_MEMBER];
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: input.name.trim() || "Novo projeto sem nome",
      mode: input.mode,
      activityCount: 0,
      completedCount: 0,
      hierarchyLevels: input.hierarchyLevels,
      progressPercent: 0,
      spi: null,
      team,
      updatedAt: minutesAgo(0),
    };
    setProjects((prev) => [newProject, ...prev]);
  }

  // Append direto, sem validação própria — mesma simplicidade de createProject. A
  // checagem de duplicidade vive na camada de UI (InviteUserModal), que já tem o
  // project.team completo para comparar contra.
  function addTeamMember(projectId: string, member: TeamMember): void {
    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? { ...project, team: [...project.team, member] } : project))
    );
  }

  // Substitui, no lugar, as entradas TeamMember daquele nome no projeto por uma nova por
  // papel em `roles` — é a mesma operação que "readicionar com outro papel" já faz em
  // NewProjectModal, só que em lote/via edição. Reaproveita initials/email da entrada
  // existente; se por algum motivo não houver nenhuma entrada prévia com esse nome,
  // deriva initials via getInitials. As novas entradas entram na posição da primeira
  // ocorrência do nome (não são anexadas ao final) — senão editar os papéis de alguém
  // jogaria a linha dele pro fim da tabela de usuários.
  function replaceTeamMemberRoles(projectId: string, memberName: string, roles: UserRole[]): void {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        const existing = project.team.find((member) => member.name === memberName);
        const newEntries: TeamMember[] = roles.map((role) => ({
          id: existing?.id,
          initials: existing?.initials ?? getInitials(memberName),
          name: memberName,
          email: existing?.email,
          role,
        }));

        const team: TeamMember[] = [];
        let inserted = false;
        for (const member of project.team) {
          if (member.name !== memberName) {
            team.push(member);
            continue;
          }
          if (!inserted) {
            team.push(...newEntries);
            inserted = true;
          }
        }
        if (!inserted) team.push(...newEntries);

        return { ...project, team };
      })
    );
  }

  return { projects, stats, loading, error, createProject, addTeamMember, replaceTeamMemberRoles };
}
