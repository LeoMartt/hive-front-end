import { createContext, useContext } from "react";
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

export interface ProjectConfigContextValue {
  config: ProjectConfig;
  setConfig: (config: ProjectConfig) => void;
}

// Objeto de Context em arquivo próprio (sem JSX) — ProjectConfigProvider.tsx só exporta o
// componente Provider, mantendo cada arquivo .tsx exportando só componentes (react-refresh).
export const ProjectConfigContext = createContext<ProjectConfigContextValue | null>(null);

export function useProjectConfig(): ProjectConfigContextValue {
  const ctx = useContext(ProjectConfigContext);
  if (!ctx) {
    throw new Error("useProjectConfig deve ser usado dentro de ProjectConfigProvider");
  }
  return ctx;
}
