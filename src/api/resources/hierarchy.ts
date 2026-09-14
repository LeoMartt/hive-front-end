import { z } from "zod";
import { httpClient } from "../client";
import { hierarchyNodeSchema } from "../schemas/hierarchy";
import type { HierarchyNode } from "../../types/project";

export const hierarchyApi = {
  async list(projectId: string): Promise<HierarchyNode[]> {
    const { data } = await httpClient.get(`/projects/${projectId}/hierarchy/`);
    return z.array(hierarchyNodeSchema).parse(data);
  },
};
