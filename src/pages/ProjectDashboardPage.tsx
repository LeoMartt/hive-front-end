import { useState } from "react";
import LoadingState from "../components/common/LoadingState";
import { useParams } from "react-router";
import DashboardActivitiesBlock from "../components/dashboard/DashboardActivitiesBlock";
import DashboardIssuesBlock from "../components/dashboard/DashboardIssuesBlock";
import CurvaSChart from "../components/dashboard/CurvaSChart";
import IndicatorDonuts from "../components/dashboard/IndicatorDonuts";
import RecentActivityLog from "../components/dashboard/RecentActivityLog";
import NavIcon from "../components/common/NavIcon";
import { projectsApi } from "../api/resources/projects";
import { useDashboard } from "../hooks/useDashboard";
import { activitiesApi } from "../api/resources/activities";
import { issuesApi } from "../api/resources/issues";
import { useMocks } from "../config/env";
import type { Activity } from "../types/activity";
import type { Issue } from "../types/issue";
import { useProjects } from "../hooks/useProjects";
import { downloadBlob } from "../utils/downloadBlob";
import { useProjectConfig } from "../context/ProjectConfigContext";

function auditFilename(projectName: string | undefined): string {
  const base = (projectName ?? "projeto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return `hive_auditoria_${base || "projeto"}_${stamp}.zip`;
}

export default function ProjectDashboardPage() {
  const { can } = useProjectConfig();
  const { id } = useParams();
  const projectId = id ?? "";
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);
  const [auditLabel, setAuditLabel] = useState("Gerar auditoria");
  const [auditLoading, setAuditLoading] = useState(false);

  const { data, loading, error, mockActivities, mockIssues } = useDashboard(projectId);

  const modeLabel = currentProject?.mode === "cutover" ? "Cutover" : "UAT";

  async function handleAuditExport() {
    if (!projectId || auditLoading) return;
    setAuditLoading(true);
    setAuditLabel("Gerando...");
    try {
      const packageBlob = await projectsApi.downloadAuditPackage(projectId);
      downloadBlob(packageBlob, auditFilename(currentProject?.name));
      setAuditLabel("Auditoria baixada");
      setTimeout(() => setAuditLabel("Gerar auditoria"), 1800);
    } catch {
      setAuditLabel("Auditoria pendente");
      setTimeout(() => setAuditLabel("Gerar auditoria"), 2200);
    } finally {
      setAuditLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <div className="error-banner" role="alert">{error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">{currentProject?.name ?? "Projeto"}</div>
          <div className="page-desc compact">{modeLabel} · atualizado em tempo real via trilha de auditoria</div>
        </div>
        <div className="head-actions">
          {can("data_export") && <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleAuditExport}
            disabled={auditLoading}
            title="Gera um ZIP com um DOCX por atividade e links das evidencias do projeto."
          >
            <NavIcon>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 15h6" />
              <path d="M9 18h4" />
            </NavIcon>
            {auditLabel}
          </button>}
        </div>
      </div>

      <DashboardActivitiesBlock projectName={currentProject?.name ?? "Projeto"} loadActivities={async () => useMocks ? mockActivities as Activity[] : activitiesApi.exportDetails(projectId)} stats={data.activities} spi={data.spi} />
      <DashboardIssuesBlock projectName={currentProject?.name ?? "Projeto"} loadIssues={async () => useMocks ? mockIssues as Issue[] : issuesApi.exportDetails(projectId)} stats={data.issues} />

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Curva S <span>planejado vs. realizado</span>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: "#8E9096" }} />
                Planejado
              </span>
              <span>
                <i style={{ background: "#8A6D00" }} />
                Realizado
              </span>
            </div>
          </div>
          <CurvaSChart data={data.curve} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Distribuição <span>indicadores operacionais</span>
            </div>
          </div>
          <IndicatorDonuts pace={data.indicators.pace} quality={data.indicators.quality} backlog={data.indicators.backlog} />
        </div>
      </div>

      <RecentActivityLog entries={data.recent} />
    </div>
  );
}
