import { useNavigate } from "react-router";
import ProgressBar from "react-bootstrap/ProgressBar";
import Badge from "react-bootstrap/Badge";
import TeamAvatars from "./TeamAvatars";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { getProjectStatusVariant, getSpiVariant } from "../../utils/projectIndicators";
import type { Project } from "../../types/project";

interface ProjectRowProps {
  project: Project;
  onOpenTeam: (team: Project["team"]) => void;
}

export default function ProjectRow({ project, onOpenTeam }: ProjectRowProps) {
  const navigate = useNavigate();
  const statusVariant = getProjectStatusVariant(project);
  const spiVariant = getSpiVariant(project.spi);
  const hierarchyLabel = [...project.hierarchyLevels, "Atividade"].join(" > ");

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/projetos/${project.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/projetos/${project.id}`);
        }
      }}
    >
      <td>
        <div className="d-flex gap-2">
          <span className={`accent-bar accent-bar-${statusVariant}`} />
          <div>
            <Badge bg={project.mode === "uat" ? "info" : "warning"} className="mb-1">
              {project.mode === "uat" ? "UAT" : "Cutover"}
            </Badge>
            <div className="fw-semibold">{project.name}</div>
            <div className="text-body-secondary small">
              {project.activityCount} atividades · nível {hierarchyLabel}
            </div>
          </div>
        </div>
      </td>
      <td className="progress-cell">
        <ProgressBar now={project.progressPercent} variant={statusVariant} className="mb-1" />
        <div className="d-flex justify-content-between text-body-secondary small font-monospace">
          <span>{project.progressPercent}%</span>
          <span>
            {project.completedCount}/{project.activityCount}
          </span>
        </div>
      </td>
      <td>
        {project.spi !== null && spiVariant ? (
          <span className={`spi-value spi-value-${spiVariant}`}>{project.spi.toFixed(2)}</span>
        ) : (
          <span className="text-body-secondary">—</span>
        )}
      </td>
      <td onClick={(event) => event.stopPropagation()}>
        <TeamAvatars team={project.team} onOpenTeam={() => onOpenTeam(project.team)} />
      </td>
      <td className="text-body-secondary small font-monospace">
        {formatRelativeTime(project.updatedAt)}
      </td>
    </tr>
  );
}
