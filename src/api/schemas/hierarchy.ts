import { z } from "zod";
import type { HierarchyNode } from "../../types/project";

export const hierarchyNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  level: z.union([z.literal(1), z.literal(2)]),
  name: z.string(),
  order: z.number().nullable(),
  createdAt: z.string(),
}) satisfies z.ZodType<HierarchyNode>;
