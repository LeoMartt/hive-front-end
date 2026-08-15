export type LogEntryIcon = "status" | "block" | "done" | "issue";

export interface LogEntry {
  id: string;
  icon: LogEntryIcon;
  refId: string;
  refName: string;
  text: string;
  authorInitials: string;
  authorName: string;
  at: string;
}
