import { useNavigate } from "react-router";
import TeamAvatars from "./TeamAvatars";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { getProjectStatusVariant, getSpiVariant, type StatusVariant } from "../../utils/projectIndicators";
import type { Project } from "../../types/project";

interface ProjectRowProps {
  project: Project;
  onOpenTeam: (team: Project["team"]) => void;
}

// A barra de progresso só tem 3 cores no mockup: "warning" usa o mesmo vermelho de "danger"
// (só a accent-bar tem a 4ª cor, laranja, para diferenciar a severidade).
const PROGRESS_FILL_CLASS: Record<StatusVariant, string> = {
  success: "green",
  danger: "red",
  warning: "red",
  info: "blue",
};

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
        <div className="proj-row">
          <span className={`accent-bar accent-bar-${statusVariant}`} />
          <div className="proj-main">
            <div className="proj-top">
              <span className={`mode-tag ${project.mode}`}>{project.mode === "uat" ? "UAT" : "Cutover"}</span>
            </div>
            <div className="proj-name">{project.name}</div>
            <div className="proj-meta">
              {project.activityCount} atividades · nível {hierarchyLabel}
            </div>
          </div>
        </div>
      </td>
      <td>
        <div className="prog-wrap">
          <div className="prog-track">
            <div
              className={`prog-fill ${PROGRESS_FILL_CLASS[statusVariant]}`}
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
          <div className="prog-nums">
            <span>{project.progressPercent}%</span>
            <span>
              {project.completedCount}/{project.activityCount}
            </span>
          </div>
        </div>
      </td>
      <td>
        {project.spi !== null && spiVariant ? (
          <span className={`spi-value spi-value-${spiVariant}`}>{project.spi.toFixed(2)}</span>
        ) : (
          <span className="mono">—</span>
        )}
      </td>
      <td onClick={(event) => event.stopPropagation()}>
        <TeamAvatars team={project.team} onOpenTeam={() => onOpenTeam(project.team)} />
      </td>
      <td className="updated">{formatRelativeTime(project.updatedAt)}</td>
    </tr>
  );
}
