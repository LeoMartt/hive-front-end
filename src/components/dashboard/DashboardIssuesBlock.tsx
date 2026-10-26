import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import { useExportButton } from "../../hooks/useExportButton";
import { buildIssueExportRows, ISSUE_EXPORT_COLUMN_WIDTHS } from "../../utils/issueExport";
import { downloadXlsx } from "../../utils/downloadXlsx";
import type { Issue, IssueStats } from "../../types/issue";
import { useProjectConfig } from "../../context/ProjectConfigContext";

interface DashboardIssuesBlockProps {
  projectName: string;
  loadIssues: () => Promise<Issue[]>;
  stats: IssueStats;
}

export default function DashboardIssuesBlock({ projectName, loadIssues, stats }: DashboardIssuesBlockProps) {
  const { can } = useProjectConfig();
  const tempoMedioLabel =
    stats.tempoMedioResolucaoDias === null ? "—" : `${stats.tempoMedioResolucaoDias.toFixed(1).replace(".", ",")}d`;

  const {
    label: exportLabel,
    isDefault: exportIsDefault,
    handleClick: handleExport,
  } = useExportButton("Exportar issues", stats.total === 0, "Nenhuma issue no projeto", async () =>
    downloadXlsx(buildIssueExportRows(await loadIssues()), ISSUE_EXPORT_COLUMN_WIDTHS, "Issues", "Base ISS", projectName),
  );

  return (
    <div className="metric-block issues">
      <div className="section-head">
        <div className="section-label">Issues</div>
        {can("data_export") && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExport}>
          {exportIsDefault ? (
            <>
              <NavIcon>
                <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </NavIcon>
              {exportLabel}
            </>
          ) : (
            exportLabel
          )}
        </button>}
      </div>
      <div className="stat-grid-issues stat-grid-issues-complete">
        <StatCard label="Total de issues" value={String(stats.total)} sub="todos os estados" />
        <StatCard label="Abertas" value={String(stats.abertas)} sub="análise não iniciada" />
        <StatCard label="Em análise" value={String(stats.emAnalise)} sub="análise iniciada" />
        <StatCard
          label="Em solução proposta"
          value={String(stats.solucaoProposta)}
          sub="aguardando reteste"
          tone="y"
        />
        <StatCard label="Concluídas" value={String(stats.concluidas)} sub={`${stats.total} no total`} tone="g" />
        <StatCard label="Canceladas" value={String(stats.canceladas)} sub={`${stats.total} no total`} />
        <StatCard label="Tempo médio resolução" value={tempoMedioLabel} sub="últimas concluídas" />
      </div>
    </div>
  );
}
