import { useMemo, useState } from "react";
import { useParams } from "react-router";
import DashboardActivitiesBlock from "../components/dashboard/DashboardActivitiesBlock";
import DashboardIssuesBlock from "../components/dashboard/DashboardIssuesBlock";
import CurvaSChart from "../components/dashboard/CurvaSChart";
import IndicatorDonuts from "../components/dashboard/IndicatorDonuts";
import RecentActivityLog from "../components/dashboard/RecentActivityLog";
import NavIcon from "../components/common/NavIcon";
import { projectsApi } from "../api/resources/projects";
import { useActivities } from "../hooks/useActivities";
import { useIssues } from "../hooks/useIssues";
import { useActivityLog } from "../hooks/useActivityLog";
import { useCurvaSData } from "../hooks/useCurvaSData";
import { useProjects } from "../hooks/useProjects";
import { computeIndicators, computeSpi } from "../utils/dashboardMetrics";
import { downloadBlob } from "../utils/downloadBlob";

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
  const { id } = useParams();
  const projectId = id ?? "";
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);
  const [auditLabel, setAuditLabel] = useState("Gerar auditoria");
  const [auditLoading, setAuditLoading] = useState(false);

  const { activities, stats } = useActivities(projectId);
  const { issues, stats: issueStats } = useIssues(projectId);
  const logEntries = useActivityLog(activities, issues);
  const curvaS = useCurvaSData(activities);

  const spi = useMemo(() => computeSpi(activities), [activities]);
  const indicators = useMemo(() => computeIndicators(activities), [activities]);

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

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">{currentProject?.name ?? "Projeto"}</div>
          <div className="page-desc compact">{modeLabel} · atualizado em tempo real via trilha de auditoria</div>
        </div>
        <div className="head-actions">
          <button
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
          </button>
        </div>
      </div>

      <DashboardActivitiesBlock activities={activities} stats={stats} spi={spi} />
      <DashboardIssuesBlock issues={issues} stats={issueStats} />

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
          <CurvaSChart data={curvaS} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Distribuição <span>indicadores operacionais</span>
            </div>
          </div>
          <IndicatorDonuts pace={indicators.pace} quality={indicators.quality} backlog={indicators.backlog} />
        </div>
      </div>

      <RecentActivityLog entries={logEntries} />
    </div>
  );
}
