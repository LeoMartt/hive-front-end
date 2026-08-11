import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import StatCard from "../components/projects/StatCard";
import ProjectsToolbar, { type ProjectsTabFilter } from "../components/projects/ProjectsToolbar";
import ProjectsTable from "../components/projects/ProjectsTable";
import TeamModal from "../components/projects/TeamModal";
import NewProjectModal from "../components/projects/NewProjectModal";
import FooterWidget from "../components/projects/FooterWidget";
import { useProjects } from "../hooks/useProjects";
import type { TeamMember } from "../types/project";

export default function ProjectsPage() {
  const { projects, stats, createProject } = useProjects();
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
    <main className="container py-5 projects-page">
      <FooterWidget userName="Guilherme Fabretti" userRole="Gestor de Projetos" />

      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1">Dashboard</h1>
          <p className="text-body-secondary small mb-0">
            Visão geral das homologações em UAT e Cutover
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNewProjectModal(true)}>
          Novo projeto
        </Button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <StatCard label="Projetos ativos" value={String(stats.total)} sub={projectsSubLabel} />
        </div>
        <div className="col-md-6">
          <StatCard
            label="SPI médio pessoal"
            value={avgSpiLabel}
            sub="Calculado sobre os projetos ativos"
          />
        </div>
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

      <div className="card">
        <ProjectsTable projects={filteredProjects} onOpenTeam={setTeamModalMembers} />
      </div>

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
