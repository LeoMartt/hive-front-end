import { z } from "zod";
import { httpClient } from "../client";
import { issueSchema, issueSummarySchema } from "../schemas/issue";
import { sharedRead } from "../sharedRead";
import type { IssueSummary } from "../../types/issue";
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
  async get(projectId: string, issueId: string): Promise<Issue> {
    const { data } = await httpClient.get(`/projects/${projectId}/issues/${issueUrlId(issueId)}/`);
    return issueSchema.parse(data);
  },

  async summaries(projectId: string, activityId?: string): Promise<IssueSummary[]> {
    return sharedRead(`issues:${projectId}:${activityId ?? "all"}:summary`, async () => {
      const { data } = await httpClient.get(`/projects/${projectId}/issues/`, {
        params: { view: "summary", ...(activityId ? { activityId: Number(activityId.replace(/^ATV-/, "")) } : {}) },
      });
      return z.array(issueSummarySchema).parse(data);
    });
  },

  async exportDetails(projectId: string, ids?: string[]): Promise<Issue[]> {
    if (ids?.length === 0) return [];
    if (ids && ids.length > 200) {
      const rows: Issue[] = [];
      for (let index = 0; index < ids.length; index += 200) rows.push(...await issuesApi.exportDetails(projectId, ids.slice(index, index + 200)));
      return rows;
    }
    const { data } = await httpClient.get(`/projects/${projectId}/issues/`, {
      params: ids ? { ids: ids.map(issueUrlId).join(",") } : undefined,
    });
    const rows = z.array(issueSchema).parse(data);
    const order = new Map(ids?.map((id, index) => [id, index]));
    return ids ? rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) : rows;
  },
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
