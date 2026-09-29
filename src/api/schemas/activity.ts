import { z } from "zod";
import type { Activity } from "../../types/activity";

const activityAttachmentSchema = z.object({
  fileName: z.string(),
  sizeLabel: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  contentType: z.string().optional(),
  storagePath: z.string().optional(),
  url: z.string().optional(),
  urlExpiresAt: z.string().optional(),
});

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["aguardando", "liberado", "bloqueado", "concluido", "cancelado"]),
  module: z.string(),
  process: z.string(),
  testerId: z.string().optional(),
  tester: z.string(),
  developerId: z.string().optional(),
  dev: z.string(),
  plannedStart: z.string(),
  plannedEnd: z.string(),
  actualStart: z.string().nullable(),
  actualEnd: z.string().nullable(),
  predecessors: z.array(z.string()),
  retestCount: z.number(),
  issueCount: z.number(),
  area: z.string(),
  system: z.string(),
  transaction: z.string(),
  expectedResult: z.string(),
  notes: z.string().nullable(),
  attachments: z.array(activityAttachmentSchema),
  approvalEvidence: activityAttachmentSchema.nullable(),
  approvalNote: z.string().nullable(),
  rejectedAt: z.string().nullable(),
}) satisfies z.ZodType<Activity>;
