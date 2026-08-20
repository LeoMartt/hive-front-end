import type { Project } from "../types/project";
import type { ProjectConfig } from "../types/projectConfig";

export type StatusVariant = "success" | "danger" | "warning" | "info";
export type SpiVariant = "good" | "warn" | "bad";

export function getProjectStatusVariant(project: Project): StatusVariant {
  if (project.progressPercent >= 100) return "success";
  if (project.spi !== null && project.spi < 0.7) {
    // Em Cutover o atraso é mais crítico (perto do go-live) do que em UAT.
    return project.mode === "cutover" ? "danger" : "warning";
  }
  return "info";
}

// Usada pela lista global de Projetos — limiares fixos, fora do alcance do
// ProjectConfigProvider (que só cobre a árvore de rotas de um projeto específico).
export function getSpiVariant(spi: number | null): SpiVariant | null {
  if (spi === null) return null;
  if (spi >= 0.9) return "good";
  if (spi >= 0.7) return "warn";
  return "bad";
}

// Mesma lógica de 3 faixas de getSpiVariant, mas com limiares configuráveis em
// Papéis & Config — usada pelo SPI do Dashboard do próprio projeto.
export function getSpiVariantWithThresholds(
  spi: number | null,
  config: Pick<ProjectConfig, "spiSaudavel" | "spiCritico">
): SpiVariant | null {
  if (spi === null) return null;
  if (spi >= config.spiSaudavel) return "good";
  if (spi >= config.spiCritico) return "warn";
  return "bad";
}
