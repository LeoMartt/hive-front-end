import { useState, type ReactNode } from "react";
import { DEFAULT_PROJECT_CONFIG, ProjectConfigContext } from "./ProjectConfigContext";
import type { ProjectConfig } from "../types/projectConfig";

// Estado único e global (não por projectId) — mesma simplificação que useIssues/useActivities
// já assumem (ambos ignoram projectId e retornam sempre o mesmo dataset mock). Não existe
// backend real por trás; diferenciar por projeto seria complexidade sem contrapartida.
export function ProjectConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_PROJECT_CONFIG);
  return <ProjectConfigContext.Provider value={{ config, setConfig }}>{children}</ProjectConfigContext.Provider>;
}
