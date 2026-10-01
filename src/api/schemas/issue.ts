import { z } from "zod";
import type { Issue } from "../../types/issue";

const issueAttachmentSchema = z.object({
  fileName: z.string(),
  sizeLabel: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  contentType: z.string().optional(),
  storagePath: z.string().optional(),
  url: z.string().optional(),
  urlExpiresAt: z.string().optional(),
});

export const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["aberta", "em_analise", "solucao_proposta", "concluida", "cancelada"]),
  impeditiva: z.boolean(),
  type: z.enum(["requisito", "performance", "dados", "integracao", "interface", "configuracao", "outro"]),
  impact: z.enum(["muito_alto", "alto", "medio", "baixo"]),
  area: z.string(),
  tester: z.string(),
  dev: z.string(),
  relatedActivityId: z.string(),
  cascadeActivityIds: z.array(z.string()),
  openedAt: z.string(),
  resolvedAt: z.string().nullable(),
  description: z.string(),
  impactNote: z.string(),
  proposedSolution: z.string().nullable(),
  analysisStartedAt: z.string().nullable(),
  solutionProposedAt: z.string().nullable(),
  openingAttachment: issueAttachmentSchema.nullable(),
  solutionAttachment: issueAttachmentSchema.nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}) satisfies z.ZodType<Issue>;
