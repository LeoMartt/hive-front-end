import { z } from "zod";
import { httpClient } from "../client";
import { projectSchema } from "../schemas/project";
import type { Project } from "../../types/project";

// Só o caminho de LEITURA está definido. Criação/edição de membros seguem mock
// no useProjects até existir endpoint para testar (ver ADR 0001, seção 6.3).
export const projectsApi = {
  async list(): Promise<Project[]> {
    const { data } = await httpClient.get("/projects");
    return z.array(projectSchema).parse(data);
  },
};
