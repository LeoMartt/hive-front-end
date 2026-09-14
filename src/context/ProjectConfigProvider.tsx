import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { DEFAULT_PROJECT_CONFIG, ProjectConfigContext } from "./ProjectConfigContext";
import { useMocks } from "../config/env";
import { projectsApi } from "../api/resources/projects";
import type { Project } from "../types/project";
import type { ProjectConfig } from "../types/projectConfig";

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
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_PROJECT_CONFIG);
  const [projectMode, setProjectMode] = useState<Project["mode"]>("uat");

  useEffect(() => {
    if (useMocks || !projectId) return;
    let cancelled = false;
    projectsApi
      .detail(projectId)
      .then((project) => {
        if (cancelled) return;
        setProjectMode(project.mode);
        setConfig((previous) => mergeProjectConfig(project, previous));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function saveConfig(nextConfig: ProjectConfig) {
    setConfig(nextConfig);
    if (useMocks || !projectId) return;

    const aging = projectMode === "cutover" ? nextConfig.agingCutover : nextConfig.agingUat;
    void projectsApi
      .update(projectId, {
        spiSaudavel: nextConfig.spiSaudavel,
        spiCritico: nextConfig.spiCritico,
        agingAlertaDias: aging.alerta,
        agingRiscoDias: aging.risco,
        anexoMaxMb: nextConfig.anexoMaxMb,
        exigirEvidenciaAtividade: nextConfig.evidenciaObrigatoriaAtividade,
        exigirEvidenciaIssue: nextConfig.evidenciaObrigatoriaIssue,
      })
      .then((project) => {
        setProjectMode(project.mode);
        setConfig((previous) => mergeProjectConfig(project, previous));
      })
      .catch(() => undefined);
  }

  return <ProjectConfigContext.Provider value={{ config, setConfig: saveConfig }}>{children}</ProjectConfigContext.Provider>;
}
