import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { DEFAULT_PROJECT_CONFIG, ProjectConfigContext } from "./ProjectConfigContext";
import { useMocks } from "../config/env";
import { projectsApi } from "../api/resources/projects";
import { useProjects } from "../hooks/useProjects";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getCurrentUserMemberships, membershipsAllowProjectManagement } from "../utils/projectAccess";
import type { Project } from "../types/project";
import type { ProjectConfig } from "../types/projectConfig";
import { normalizeError } from "../api/apiError";

function mergeProjectConfig(project: Project, previous: ProjectConfig): ProjectConfig {
  const aging = {
    alerta: project.agingAlertaDias ?? previous.agingUat.alerta,
    risco: project.agingRiscoDias ?? previous.agingUat.risco,
  };
  return {
    ...previous,
    spiSaudavel: project.spiSaudavel ?? previous.spiSaudavel,
    spiCritico: project.spiCritico ?? previous.spiCritico,
    agingUat: project.mode === "uat" ? aging : previous.agingUat,
    agingCutover: project.mode === "cutover" ? aging : previous.agingCutover,
    anexoMaxMb: project.anexoMaxMb ?? previous.anexoMaxMb,
    evidenciaObrigatoriaAtividade:
      project.exigirEvidenciaAtividade ?? previous.evidenciaObrigatoriaAtividade,
    evidenciaObrigatoriaIssue: project.exigirEvidenciaIssue ?? previous.evidenciaObrigatoriaIssue,
  };
}

export function ProjectConfigProvider({ children }: { children: ReactNode }) {
  const { id: projectId } = useParams();
  const { projects } = useProjects();
  const currentUser = useCurrentUser();
  const currentProject = projects.find((project) => project.id === projectId);
  const canManage = membershipsAllowProjectManagement(getCurrentUserMemberships(currentProject?.team ?? [], currentUser));
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_PROJECT_CONFIG);
  const [projectMode, setProjectMode] = useState<Project["mode"]>("uat");
  const [loading, setLoading] = useState(!useMocks);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (useMocks || !projectId) return;
    let cancelled = false;
    projectsApi
      .detail(projectId)
      .then((project) => {
        if (cancelled) return;
        setProjectMode(project.mode);
        setConfig(mergeProjectConfig(project, DEFAULT_PROJECT_CONFIG));
      })
      .catch((error) => { if (!cancelled) setLoadError(normalizeError(error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [projectId, loadAttempt]);

  async function saveConfig(nextConfig: ProjectConfig) {
    if (!canManage || !projectId) throw new Error("Apenas gestores do projeto podem alterar configurações.");
    if (loading || loadError) throw new Error("Aguarde o carregamento das configurações do projeto.");
    if (useMocks) {
      setConfig(nextConfig);
      return;
    }

    const aging = projectMode === "cutover" ? nextConfig.agingCutover : nextConfig.agingUat;
    const project = await projectsApi.update(projectId, {
        spiSaudavel: nextConfig.spiSaudavel,
        spiCritico: nextConfig.spiCritico,
        agingAlertaDias: aging.alerta,
        agingRiscoDias: aging.risco,
        anexoMaxMb: nextConfig.anexoMaxMb,
        exigirEvidenciaAtividade: nextConfig.evidenciaObrigatoriaAtividade,
        exigirEvidenciaIssue: nextConfig.evidenciaObrigatoriaIssue,
      });
    setProjectMode(project.mode);
    setConfig((previous) => mergeProjectConfig(project, previous));
  }

  return (
    <ProjectConfigContext.Provider value={{ config, canManage: canManage && !loading && !loadError, ready: !loading && !loadError, setConfig: saveConfig }}>
      {loadError && (
        <div className="error-banner" role="alert">
          {loadError}
          <button type="button" className="btn btn-sm" onClick={() => {
            setLoadError(null);
            setLoading(true);
            setLoadAttempt((attempt) => attempt + 1);
          }}>Tentar novamente</button>
        </div>
      )}
      {children}
    </ProjectConfigContext.Provider>
  );
}
