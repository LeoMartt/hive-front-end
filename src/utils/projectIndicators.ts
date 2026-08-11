import type { Project } from "../types/project";

export type StatusVariant = "success" | "danger" | "info";
export type SpiVariant = "good" | "warn" | "bad";

export function getProjectStatusVariant(project: Project): StatusVariant {
  if (project.progressPercent >= 100) return "success";
  if (project.spi !== null && project.spi < 0.7) return "danger";
  return "info";
}

export function getSpiVariant(spi: number | null): SpiVariant | null {
  if (spi === null) return null;
  if (spi >= 0.9) return "good";
  if (spi >= 0.7) return "warn";
  return "bad";
}
