export type ActivityStatus =
  | "aguardando"
  | "liberado"
  | "execucao"
  | "bloqueado"
  | "concluido"
  | "cancelado";

export interface ActivityAttachment {
  fileName: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Activity {
  id: string;
  name: string;
  status: ActivityStatus;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  predecessors: string[];
  retestCount: number;
  issueCount: number;
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string | null;
  attachments: ActivityAttachment[];
  approvalEvidence: ActivityAttachment | null;
  approvalNote: string | null;
  rejectedAt: string | null;
}

export interface NewActivityInput {
  name: string;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string[];
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string | null;
}

export interface ConcludeActivityInput {
  approvalNote: string | null;
  approvalEvidence: ActivityAttachment;
}

export interface RejectActivityInput {
  reason: string;
  evidence: ActivityAttachment | null;
}

export interface ActivityStats {
  total: number;
  concluido: number;
  execucao: number;
  bloqueado: number;
  aguardando: number;
  atrasado: number;
}

export type ActivityGroupMode = "tree" | "tester" | "status";

export interface ActivityFiltersState {
  search: string;
  statuses: ActivityStatus[];
  testers: string[];
  devs: string[];
  dateRangeEnabled: boolean;
  plannedEndFrom: string | null;
  plannedEndTo: string | null;
  retestBuckets: number[];
  modules: string[];
  processes: string[];
  onlyMine: boolean;
  onlyOverdue: boolean;
}

export interface ProcessGroup {
  process: string;
  activities: Activity[];
}

export interface ModuleGroup {
  module: string;
  processes: ProcessGroup[];
}

export interface FlatActivityGroup {
  key: string;
  label: string;
  activities: Activity[];
}
