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
    const { data } = await httpClient.post(`/projects/${projectId}/issues/`, {
      title: input.title,
      description: input.description,
      type: input.type,
      impeditiva: input.impeditiva,
      impact: input.impact,
      impactNote: input.impactNote,
      dev: input.dev,
      relatedActivityId: input.relatedActivityId,
      openingAttachment: input.openingAttachment,
    });
    return issueSchema.parse(data);
  },

  async startAnalysis(projectId: string, issueId: string): Promise<Issue> {
    const { data } = await httpClient.post(
      `/projects/${projectId}/issues/${issueUrlId(issueId)}/start-analysis/`,
    );
    return issueSchema.parse(data);
  },

  async proposeSolution(projectId: string, issueId: string, input: ProposeSolutionInput): Promise<Issue> {
    const { data } = await httpClient.post(
      `/projects/${projectId}/issues/${issueUrlId(issueId)}/propose-solution/`,
      input,
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
