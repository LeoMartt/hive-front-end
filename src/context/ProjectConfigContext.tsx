import { createContext, useContext, useState, type ReactNode } from "react";
import type { ProjectConfig } from "../types/projectConfig";

// Mesmos valores hoje hardcoded em issueIndicators.ts (AGING_ALERTA_DAYS=2/AGING_RISCO_DAYS=6)
// e no antigo getSpiVariant (0.90/0.70, ajustado aqui para o par saudável/crítico do
// mockup 0.90/0.75). agingCutover é novo — Cutover é operacionalmente mais crítico
// (janela pré-go-live curta), limiares mais apertados.
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  spiSaudavel: 0.9,
  spiCritico: 0.75,
  agingUat: { alerta: 2, risco: 6 },
  agingCutover: { alerta: 3, risco: 8 },
};

interface ProjectConfigContextValue {
  config: ProjectConfig;
  setConfig: (config: ProjectConfig) => void;
}

const ProjectConfigContext = createContext<ProjectConfigContextValue | null>(null);

// Estado único e global (não por projectId) — mesma simplificação que useIssues/useActivities
// já assumem (ambos ignoram projectId e retornam sempre o mesmo dataset mock). Não existe
// backend real por trás; diferenciar por projeto seria complexidade sem contrapartida.
export function ProjectConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_PROJECT_CONFIG);
  return <ProjectConfigContext.Provider value={{ config, setConfig }}>{children}</ProjectConfigContext.Provider>;
}

export function useProjectConfig(): ProjectConfigContextValue {
  const ctx = useContext(ProjectConfigContext);
  if (!ctx) {
    throw new Error("useProjectConfig deve ser usado dentro de ProjectConfigProvider");
  }
  return ctx;
}
