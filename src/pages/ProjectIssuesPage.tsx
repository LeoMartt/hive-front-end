import { useMemo, useState } from "react";
import { useParams } from "react-router";
import IssuesKpiCards from "../components/issues/IssuesKpiCards";
import IssueStatusPills, { type IssueStatusFilter } from "../components/issues/IssueStatusPills";
import IssuesTable from "../components/issues/IssuesTable";
import NavIcon from "../components/common/NavIcon";
import { useIssues } from "../hooks/useIssues";
import { sortIssuesByPriority } from "../utils/issueIndicators";

const CURRENT_USER_NAME = "Guilherme Fabretti";

export default function ProjectIssuesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { issues } = useIssues(projectId);

  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>("todas");
  const [openedByMe, setOpenedByMe] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);

  const orderedIssues = useMemo(() => sortIssuesByPriority(issues), [issues]);

  const filteredIssues = useMemo(() => {
    return orderedIssues.filter((issue) => {
      if (statusFilter !== "todas" && issue.status !== statusFilter) return false;
      if (openedByMe && issue.tester !== CURRENT_USER_NAME) return false;
      if (assignedToMe && issue.dev !== CURRENT_USER_NAME) return false;
      return true;
    });
  }, [orderedIssues, statusFilter, openedByMe, assignedToMe]);

  const statusCounts = useMemo(() => {
    const counts: Record<IssueStatusFilter, number> = {
      todas: issues.length,
      aberta: 0,
      em_analise: 0,
      solucao_proposta: 0,
      concluida: 0,
    };
    for (const issue of issues) {
      counts[issue.status] += 1;
    }
    return counts;
  }, [issues]);

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">Issues</div>
          <div className="page-desc compact">
            Impeditivas bloqueiam a atividade vinculada até solução aprovada em reteste
          </div>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline-secondary btn-sm">
            <NavIcon>
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </NavIcon>
            Exportar issues
          </button>
          <button type="button" className="btn btn-primary btn-sm">
            + Registrar issue
          </button>
        </div>
      </div>

      <IssuesKpiCards issues={filteredIssues} projectId={projectId} />

      <div className="activities-toolbar">
        <IssueStatusPills counts={statusCounts} active={statusFilter} onSelect={setStatusFilter} />
        <div className="activities-toolbar-group">
          <label
            className={`toggle-pill${openedByMe ? " toggle-pill-active" : ""}`}
            htmlFor="issues-opened-by-me-toggle"
          >
            <span className="switch">
              <input
                type="checkbox"
                id="issues-opened-by-me-toggle"
                checked={openedByMe}
                onChange={(event) => setOpenedByMe(event.target.checked)}
              />
              <span className="track" />
            </span>
            Issues abertas por mim
          </label>
          <label
            className={`toggle-pill${assignedToMe ? " toggle-pill-active" : ""}`}
            htmlFor="issues-assigned-to-me-toggle"
          >
            <span className="switch">
              <input
                type="checkbox"
                id="issues-assigned-to-me-toggle"
                checked={assignedToMe}
                onChange={(event) => setAssignedToMe(event.target.checked)}
              />
              <span className="track" />
            </span>
            Issues comigo
          </label>
        </div>
      </div>

      <IssuesTable issues={filteredIssues} projectId={projectId} />
    </div>
  );
}
