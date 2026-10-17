import { useMemo, useState } from "react";
import LoadingState from "../components/common/LoadingState";
import { useParams } from "react-router";
import IssuesKpiCards from "../components/issues/IssuesKpiCards";
import IssueStatusPills, { type IssueStatusFilter } from "../components/issues/IssueStatusPills";
import IssuesTable from "../components/issues/IssuesTable";
import RegisterIssueModal from "../components/issues/RegisterIssueModal";
import NavIcon from "../components/common/NavIcon";
import { useIssues } from "../hooks/useIssues";
import { useActivities } from "../hooks/useActivities";
import { useExportButton } from "../hooks/useExportButton";
import { useProjects } from "../hooks/useProjects";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { sortIssuesByPriority } from "../utils/issueIndicators";
import { buildIssueExportRows, ISSUE_EXPORT_COLUMN_WIDTHS } from "../utils/issueExport";
import { downloadXlsx } from "../utils/downloadXlsx";
import { canConcludeActivity, getCurrentUserMemberships, membershipsAllowAssignedIssues, membershipsAllowIssueCreation, namesMatch } from "../utils/projectAccess";

interface CurrentIssueUser {
  name: string;
  id?: string;
  email?: string;
}

function personMatchesCurrentUser(personName: string, personId: string | undefined, currentUser: CurrentIssueUser): boolean {
  const normalizedPersonId = personId?.toLowerCase();
  const normalizedCurrentId = currentUser.id?.toLowerCase();
  const normalizedCurrentEmail = currentUser.email?.toLowerCase();

  return (
    (normalizedCurrentId !== undefined && normalizedPersonId === normalizedCurrentId) ||
    (normalizedCurrentEmail !== undefined && normalizedPersonId === normalizedCurrentEmail) ||
    namesMatch(personName, currentUser.name)
  );
}

export default function ProjectIssuesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { issues, loading, error, createIssue } = useIssues(projectId);
  const { activities, refreshActivity } = useActivities(projectId);
  const { projects } = useProjects();
  const { name: currentUserName, email: currentUserEmail, id: currentUserId } = useCurrentUser();
  const currentProject = projects.find((project) => project.id === projectId);
  const currentMemberships = getCurrentUserMemberships(currentProject?.team ?? [], {
    id: currentUserId,
    email: currentUserEmail,
    name: currentUserName,
  });
  const currentMember = currentMemberships[0];
  const canCreateIssue = membershipsAllowIssueCreation(currentMemberships);
  const canViewAssignedIssues = membershipsAllowAssignedIssues(currentMemberships);
  const eligibleIssueActivities = activities.filter((activity) =>
    activity.status !== "concluido" && activity.status !== "cancelado" &&
    canConcludeActivity(currentMemberships, activity, { id: currentUserId, email: currentUserEmail, name: currentUserName }),
  );

  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>("todas");
  const [openedByMe, setOpenedByMe] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [showRegisterIssueModal, setShowRegisterIssueModal] = useState(false);

  const orderedIssues = useMemo(() => sortIssuesByPriority(issues), [issues]);

  const filteredIssues = useMemo(() => {
    const currentIssueUser: CurrentIssueUser = {
      name: currentMember?.name ?? currentUserName,
      email: currentMember?.email ?? currentUserEmail,
      id: currentMember?.id ?? currentUserId,
    };
    return orderedIssues.filter((issue) => {
      if (statusFilter !== "todas" && issue.status !== statusFilter) return false;
      if (canCreateIssue && openedByMe && !personMatchesCurrentUser(issue.tester, issue.testerId, currentIssueUser)) {
        return false;
      }
      if (canViewAssignedIssues && assignedToMe && !personMatchesCurrentUser(issue.dev, issue.developerId, currentIssueUser)) {
        return false;
      }
      return true;
    });
  }, [
    assignedToMe,
    canCreateIssue,
    canViewAssignedIssues,
    currentMember?.email,
    currentMember?.id,
    currentMember?.name,
    currentUserEmail,
    currentUserId,
    currentUserName,
    openedByMe,
    orderedIssues,
    statusFilter,
  ]);

  const {
    label: exportIssuesLabel,
    isDefault: exportIssuesIsDefault,
    handleClick: handleExportIssues,
  } = useExportButton("Exportar issues", filteredIssues.length === 0, "Nenhuma issue no filtro atual", () =>
    downloadXlsx(buildIssueExportRows(filteredIssues), ISSUE_EXPORT_COLUMN_WIDTHS, "Issues", "hive_issues"),
  );

  const statusCounts = useMemo(() => {
    const counts: Record<IssueStatusFilter, number> = {
      todas: issues.length,
      aberta: 0,
      em_analise: 0,
      solucao_proposta: 0,
      concluida: 0,
      cancelada: 0,
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
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportIssues}>
            {exportIssuesIsDefault ? (
              <>
                <NavIcon>
                  <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                  <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </NavIcon>
                {exportIssuesLabel}
              </>
            ) : (
              exportIssuesLabel
            )}
          </button>
          {canCreateIssue && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowRegisterIssueModal(true)}>
              + Registrar issue
            </button>
          )}
        </div>
      </div>

      <IssuesKpiCards issues={filteredIssues} />

      <div className="activities-toolbar">
        <IssueStatusPills counts={statusCounts} active={statusFilter} onSelect={setStatusFilter} />
        <div className="activities-toolbar-group">
          {canCreateIssue && (
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
          )}
          {canViewAssignedIssues && <label
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
          </label>}
        </div>
      </div>

      {loading ? <LoadingState /> : error ? <div className="error-banner" role="alert">{error.message}</div> : <IssuesTable issues={filteredIssues} projectId={projectId} />}

      {canCreateIssue && (
        <RegisterIssueModal
          show={showRegisterIssueModal}
          onHide={() => setShowRegisterIssueModal(false)}
          team={currentProject?.team ?? []}
          activities={eligibleIssueActivities}
          currentUserName={currentUserName}
          onCreate={async (input) => {
            if (!eligibleIssueActivities.some((activity) => activity.id === input.relatedActivityId)) {
              throw new Error("Você não tem permissão para registrar issue nesta atividade.");
            }
            await createIssue(input);
            await refreshActivity(input.relatedActivityId);
          }}
        />
      )}
    </div>
  );
}
