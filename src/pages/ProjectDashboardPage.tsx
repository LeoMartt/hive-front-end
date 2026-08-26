import { useMemo } from "react";
import { useParams } from "react-router";
import DashboardActivitiesBlock from "../components/dashboard/DashboardActivitiesBlock";
import DashboardIssuesBlock from "../components/dashboard/DashboardIssuesBlock";
import CurvaSChart from "../components/dashboard/CurvaSChart";
import IndicatorDonuts from "../components/dashboard/IndicatorDonuts";
import RecentActivityLog from "../components/dashboard/RecentActivityLog";
import { useActivities } from "../hooks/useActivities";
import { useIssues } from "../hooks/useIssues";
import { useActivityLog } from "../hooks/useActivityLog";
import { useCurvaSData } from "../hooks/useCurvaSData";
import { useProjects } from "../hooks/useProjects";
import { computeIndicators, computeSpi } from "../utils/dashboardMetrics";

export default function ProjectDashboardPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);

  const { activities, stats } = useActivities(projectId);
  const { issues, stats: issueStats } = useIssues(projectId);
  const logEntries = useActivityLog(projectId);
  const curvaS = useCurvaSData();

  const spi = useMemo(() => computeSpi(activities), [activities]);
  const indicators = useMemo(() => computeIndicators(activities), [activities]);

  const modeLabel = currentProject?.mode === "cutover" ? "Cutover" : "UAT";

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">{currentProject?.name ?? "Projeto"}</div>
          <div className="page-desc compact">{modeLabel} · atualizado em tempo real via trilha de auditoria</div>
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
