import { z } from "zod";
import { httpClient } from "../client";
import { sharedRead } from "../sharedRead";

const dashboardSchema = z.object({
  activities: z.object({ total: z.number(), concluido: z.number(), liberado: z.number(), bloqueado: z.number(), aguardando: z.number(), cancelado: z.number(), atrasado: z.number() }),
  issues: z.object({ total: z.number(), abertas: z.number(), emAnalise: z.number(), solucaoProposta: z.number(), concluidas: z.number(), canceladas: z.number(), impeditivasAbertas: z.number(), tempoMedioResolucaoDias: z.number().nullable() }),
  spi: z.number().nullable(),
  indicators: z.object({ pace: z.number().nullable(), quality: z.number().nullable(), backlog: z.number().nullable() }),
  curve: z.object({ labels: z.array(z.string()), planned: z.array(z.number()), plannedCounts: z.array(z.number()), realized: z.array(z.number().nullable()), realizedCounts: z.array(z.number().nullable()), total: z.number() }),
  recent: z.array(z.object({ id: z.string(), icon: z.enum(["status", "block", "done", "issue"]), refId: z.string(), refName: z.string(), text: z.string(), authorInitials: z.string(), authorName: z.string(), at: z.string() })),
});

export type ProjectDashboard = z.infer<typeof dashboardSchema>;

export const dashboardApi = {
  get(projectId: string, today: string): Promise<ProjectDashboard> {
    return sharedRead(`dashboard:${projectId}:${today}`, async () => {
      const { data } = await httpClient.get(`/projects/${projectId}/dashboard/`, { params: { today } });
      return dashboardSchema.parse(data);
    });
  },
};
