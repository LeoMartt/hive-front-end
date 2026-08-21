import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { useExportButton } from "../../hooks/useExportButton";
import { getSpiVariantWithThresholds } from "../../utils/projectIndicators";
import { buildActivityExportRows, ACTIVITY_EXPORT_COLUMN_WIDTHS } from "../../utils/activityExport";
import { downloadXlsx } from "../../utils/downloadXlsx";
import type { Activity, ActivityStats } from "../../types/activity";

interface DashboardActivitiesBlockProps {
  activities: Activity[];
  stats: ActivityStats;
  spi: number | null;
}

function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// Mesma convenção g/y/r de StatCard.tsx (bad->r, warn->y, good->g).
const SPI_VARIANT_TONE = { good: "g", warn: "y", bad: "r" } as const;

export default function DashboardActivitiesBlock({ activities, stats, spi }: DashboardActivitiesBlockProps) {
  const { config } = useProjectConfig();
  const spiVariant = getSpiVariantWithThresholds(spi, config);
  const spiToneClass = spiVariant === null ? "" : ` ${SPI_VARIANT_TONE[spiVariant]}`;

  const {
    label: exportLabel,
    isDefault: exportIsDefault,
    handleClick: handleExport,
  } = useExportButton("Exportar atividades", activities.length === 0, "Nenhuma atividade no projeto", () =>
    downloadXlsx(buildActivityExportRows(activities), ACTIVITY_EXPORT_COLUMN_WIDTHS, "Atividades", "hive_atividades"),
  );

  return (
    <div className="metric-block">
      <div className="section-head">
        <div className="section-label">Atividades</div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExport}>
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
        </button>
      </div>
      <div className="stat-hero-row">
        <div className="spi-hero">
          <div className="stat-label">SPI do projeto</div>
          <div className={`spi-big${spiToneClass}`}>{spi === null ? "—" : spi.toFixed(2)}</div>
          <div className="stat-sub">Fixed Formula 0/50/100</div>
        </div>
        <div className="stat-grid-compact">
          <StatCard label="Total" value={String(stats.total)} sub="atividades" />
          <StatCard
            label="Concluído"
            value={String(stats.concluido)}
            sub={`${percentOf(stats.concluido, stats.total)}% do total`}
            tone="g"
          />
          <StatCard label="Em execução" value={String(stats.execucao)} sub="50% de peso no SPI" tone="y" />
          <StatCard label="Bloqueado" value={String(stats.bloqueado)} sub="aguardando reteste" tone="r" />
          <StatCard label="Aguardando" value={String(stats.aguardando)} sub="predecessor pendente" />
          <StatCard label="Atrasado" value={String(stats.atrasado)} sub="vs. data planejada" tone="r" />
        </div>
      </div>
    </div>
  );
}
