import { z } from "zod";
import { httpClient } from "../client";
import { issueSchema } from "../schemas/issue";
import type { Issue, NewIssueInput, ProposeSolutionInput } from "../../types/issue";

function issueUrlId(issueId: string): number {
  const normalized = issueId.trim().toUpperCase().replace(/^ISS-/, "");
  const numericId = Number(normalized);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`ID de issue inválido: ${issueId}`);
  }
  return numericId;
}

export const issuesApi = {
  async list(projectId: string): Promise<Issue[]> {
    const { data } = await httpClient.get(`/projects/${projectId}/issues/`);
    return z.array(issueSchema).parse(data);
  },

  async create(projectId: string, input: NewIssueInput): Promise<Issue> {
    const formData = new FormData();
    formData.append("title", input.title);
    formData.append("description", input.description);
    formData.append("type", input.type);
    formData.append("impeditiva", String(input.impeditiva));
    formData.append("impact", input.impact);
    formData.append("impactNote", input.impactNote);
    formData.append("dev", input.dev);
    formData.append("relatedActivityId", input.relatedActivityId);
    if (input.openingAttachment) {
      const { file, ...openingAttachment } = input.openingAttachment;
      formData.append("openingAttachment", JSON.stringify(openingAttachment));
      if (file) {
        formData.append("openingFile", file);
      }
    }

    const { data } = await httpClient.post(`/projects/${projectId}/issues/`, formData);
    return issueSchema.parse(data);
  },

  async startAnalysis(projectId: string, issueId: string): Promise<Issue> {
    const { data } = await httpClient.post(
      `/projects/${projectId}/issues/${issueUrlId(issueId)}/start-analysis/`,
    );
    return issueSchema.parse(data);
  },

  async proposeSolution(projectId: string, issueId: string, input: ProposeSolutionInput): Promise<Issue> {
    const formData = new FormData();
    formData.append("proposedSolution", input.proposedSolution);
    if (input.solutionAttachment) {
      const { file, ...solutionAttachment } = input.solutionAttachment;
      formData.append("solutionAttachment", JSON.stringify(solutionAttachment));
      if (file) {
        formData.append("solutionFile", file);
      }
    }

    const { data } = await httpClient.post(
      `/projects/${projectId}/issues/${issueUrlId(issueId)}/propose-solution/`,
      formData,
    );
    return issueSchema.parse(data);
  },

  async resolve(projectId: string, issueId: string): Promise<Issue> {
    const { data } = await httpClient.post(`/projects/${projectId}/issues/${issueUrlId(issueId)}/resolve/`);
    return issueSchema.parse(data);
  },

  async cancel(projectId: string, issueId: string): Promise<Issue> {
    const { data } = await httpClient.post(`/projects/${projectId}/issues/${issueUrlId(issueId)}/cancel/`);
    return issueSchema.parse(data);
  },
};
