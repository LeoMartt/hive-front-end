import { z } from "zod";
import { httpClient } from "../client";
import { activitySchema } from "../schemas/activity";
import type { Activity, NewActivityInput } from "../../types/activity";

function activityUrlId(activityId: string): number {
  const normalized = activityId.trim().toUpperCase().replace(/^ATV-/, "");
  const numericId = Number(normalized);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`ID de atividade inválido: ${activityId}`);
  }
  return numericId;
}

export const activitiesApi = {
  async list(projectId: string): Promise<Activity[]> {
    const { data } = await httpClient.get(`/projects/${projectId}/activities/`);
    return z.array(activitySchema).parse(data);
  },

  async create(projectId: string, input: NewActivityInput): Promise<Activity> {
    const { data } = await httpClient.post(`/projects/${projectId}/activities/`, {
      nodeId: input.nodeId,
      name: input.name,
      testerId: input.testerId,
      developerId: input.developerId,
      plannedStart: input.plannedStart.slice(0, 10),
      plannedEnd: input.plannedEnd.slice(0, 10),
      predecessors: input.predecessors,
      area: input.area,
      system: input.system,
      transaction: input.transaction,
      wbs: input.wbs,
      expectedResult: input.expectedResult,
      notes: input.notes,
    });
    return activitySchema.parse(data);
  },

  async complete(projectId: string, activityId: string, approvalNote: string | null): Promise<Activity> {
    const { data } = await httpClient.post(
      `/projects/${projectId}/activities/${activityUrlId(activityId)}/complete/`,
      { approvalNote },
    );
    return activitySchema.parse(data);
  },

  async block(projectId: string, activityId: string, reason: string): Promise<Activity> {
    const { data } = await httpClient.post(
      `/projects/${projectId}/activities/${activityUrlId(activityId)}/block/`,
      { reason },
    );
    return activitySchema.parse(data);
  },

  async cancel(projectId: string, activityId: string): Promise<Activity> {
    const { data } = await httpClient.post(
      `/projects/${projectId}/activities/${activityUrlId(activityId)}/cancel/`,
    );
    return activitySchema.parse(data);
  },
};
