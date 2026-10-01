import { z } from "zod";
import { httpClient } from "../client";
import { projectSchema, teamMemberApiSchema } from "../schemas/project";
import type { NewProjectInput, Project, TeamMember } from "../../types/project";

const paginatedProjectsSchema = z.object({
  results: z.array(projectSchema),
});

function parseProjectList(data: unknown): Project[] {
  if (Array.isArray(data)) return z.array(projectSchema).parse(data);
  return paginatedProjectsSchema.parse(data).results;
}

export type ProjectUpdateInput = Partial<{
  name: string;
  description: string;
  hierarchyLevels: string[];
  agingAlertaDias: number;
  agingRiscoDias: number;
  spiSaudavel: number;
  spiCritico: number;
  anexoMaxMb: number;
  exigirEvidenciaAtividade: boolean;
  exigirEvidenciaIssue: boolean;
}>;

export const projectsApi = {
  async list(): Promise<Project[]> {
    const { data } = await httpClient.get("/projects/");
    return parseProjectList(data);
  },

  async detail(projectId: string): Promise<Project> {
    const { data } = await httpClient.get(`/projects/${projectId}/`);
    return projectSchema.parse(data);
  },

  async create(input: NewProjectInput): Promise<Project> {
    const { data } = await httpClient.post("/projects/", input);
    return projectSchema.parse(data);
  },

  async update(projectId: string, input: ProjectUpdateInput): Promise<Project> {
    const { data } = await httpClient.patch(`/projects/${projectId}/`, input);
    return projectSchema.parse(data);
  },

  async addMembership(projectId: string, member: TeamMember): Promise<TeamMember> {
    const { data } = await httpClient.post(`/projects/${projectId}/memberships/`, member);
    return teamMemberApiSchema.parse(data);
  },

  async removeMembership(projectId: string, membershipId: string): Promise<void> {
    await httpClient.delete(`/projects/${projectId}/memberships/${membershipId}/`);
  },

  async downloadAuditPackage(projectId: string): Promise<Blob> {
    const { data } = await httpClient.get(`/projects/${projectId}/audit-export/`, {
      responseType: "blob",
    });
    return data;
  },
};
