import { useMemo, useState } from "react";
import StatCard from "../components/common/StatCard";
import ProjectsToolbar, { type ProjectsTabFilter } from "../components/projects/ProjectsToolbar";
import ProjectsTable from "../components/projects/ProjectsTable";
import TeamModal from "../components/projects/TeamModal";
import NewProjectModal from "../components/projects/NewProjectModal";
import FooterWidget from "../components/projects/FooterWidget";
import { useProjects } from "../hooks/useProjects";
import type { TeamMember } from "../types/project";

export default function ProjectsPage() {
  const { projects, stats, createProject, loading, error } = useProjects();
  const [activeTab, setActiveTab] = useState<ProjectsTabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [teamModalMembers, setTeamModalMembers] = useState<TeamMember[] | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (activeTab !== "all" && project.mode !== activeTab) return false;
      if (query && !project.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [projects, activeTab, searchQuery]);

  const avgSpiLabel = stats.avgSpi === null ? "—" : stats.avgSpi.toFixed(2);
  const projectsSubLabel = `${stats.uatCount} em UAT · ${stats.cutoverCount} em Cutover`;

  return (
    <main className="page-wrap">
      <FooterWidget />
      <div className="page-head">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-desc">Visão geral das homologações em UAT e Cutover</div>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowNewProjectModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo projeto
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Projetos ativos" value={String(stats.total)} sub={projectsSubLabel} />
        <StatCard label="SPI médio pessoal" value={avgSpiLabel} sub="Calculado sobre os projetos ativos" />
      </div>

      <ProjectsToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          all: stats.total,
          uat: stats.uatCount,
          cutover: stats.cutoverCount,
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {error ? (
        <div className="page-state page-state--error">
          Não foi possível carregar os projetos.{" "}
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </div>
      ) : loading ? (
        <div className="page-state">Carregando projetos…</div>
      ) : (
        <ProjectsTable projects={filteredProjects} onOpenTeam={setTeamModalMembers} />
      )}

      <TeamModal
        show={teamModalMembers !== null}
        onHide={() => setTeamModalMembers(null)}
        team={teamModalMembers ?? []}
      />

      <NewProjectModal
        show={showNewProjectModal}
        onHide={() => setShowNewProjectModal(false)}
        onCreate={createProject}
      />
    </main>
  );
}
