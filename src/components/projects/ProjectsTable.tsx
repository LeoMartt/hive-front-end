import Table from "react-bootstrap/Table";
import ProjectRow from "./ProjectRow";
import EmptyState from "../common/EmptyState";
import type { Project } from "../../types/project";

interface ProjectsTableProps {
  projects: Project[];
  onOpenTeam: (team: Project["team"]) => void;
}

export default function ProjectsTable({ projects, onOpenTeam }: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Nenhum resultado encontrado"
        description="Ajuste a busca ou o filtro de aba para encontrar o projeto que procura."
      />
    );
  }

  return (
    <Table hover responsive className="align-middle mb-0">
      <thead>
        <tr>
          <th className="col-project-name">Projeto</th>
          <th>Progresso</th>
          <th>SPI</th>
          <th>Equipe</th>
          <th>Atualizado</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} onOpenTeam={onOpenTeam} />
        ))}
      </tbody>
    </Table>
  );
}
