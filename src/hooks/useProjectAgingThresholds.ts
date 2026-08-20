import { useProjectConfig } from "../context/ProjectConfigContext";
import { useProjects } from "./useProjects";
import type { AgingThresholds } from "../types/projectConfig";

// Resolve os limiares de aging certos pro modo (UAT/Cutover) do projeto atual, evitando
// repetir esse lookup em cada consumidor. Projeto não encontrado (não deveria acontecer
// nas rotas que usam isso, mas evita um throw) cai no default de UAT.
export function useProjectAgingThresholds(
  projectId: string
): AgingThresholds {
  const { config } = useProjectConfig();
  const { projects } = useProjects();
  const project = projects.find((item) => item.id === projectId);
  return project?.mode === "cutover"
    ? config.agingCutover
    : config.agingUat;
}
