export type ActivityStatus =
  | "aguardando"
  | "liberado"
  | "execucao"
  | "bloqueado"
  | "concluido"
  | "cancelado";

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
