import { z } from "zod";
import type { Project } from "../../types/project";

const teamMemberSchema = z.object({
  id: z.string().optional(),
  initials: z.string(),
  name: z.string(),
  email: z.string().optional(),
  role: z.enum(["Gestor de Projetos", "Tester", "Desenvolvedor"]),
});

// `satisfies` garante em tempo de compilação que o schema não divergiu do tipo
// de domínio em src/types/project.ts. Se o tipo mudar e o schema não, tsc quebra.
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(["uat", "cutover"]),
  activityCount: z.number(),
  completedCount: z.number(),
  hierarchyLevels: z.array(z.string()),
  progressPercent: z.number(),
  spi: z.number().nullable(),
  team: z.array(teamMemberSchema),
  updatedAt: z.string(),
}) satisfies z.ZodType<Project>;
