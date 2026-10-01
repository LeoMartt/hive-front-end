import { useMemo } from "react";
import type { LogEntry } from "../types/activityLog";
import type { Activity } from "../types/activity";
import type { Issue } from "../types/issue";
import { ACTIVITY_STATUS_LABELS } from "../utils/activityIndicators";
import { ISSUE_STATUS_LABELS } from "../utils/issueIndicators";

function activityTimestamp(activity: Activity): string {
  return activity.updatedAt ?? activity.createdAt ?? activity.actualEnd ?? activity.actualStart ?? activity.plannedEnd;
}

function issueTimestamp(issue: Issue): string {
  return issue.updatedAt ?? issue.solutionProposedAt ?? issue.analysisStartedAt ?? issue.resolvedAt ?? issue.openedAt;
}

function activityIcon(activity: Activity): LogEntry["icon"] {
  if (activity.status === "concluido") return "done";
  if (activity.status === "bloqueado" || activity.status === "cancelado") return "block";
  return "status";
}

function activityText(activity: Activity): string {
  const label = ACTIVITY_STATUS_LABELS[activity.status];
  if (activity.status === "concluido") return "marcada como Concluído";
  if (activity.status === "bloqueado") return `status atual ${label}`;
  return `status atual ${label}`;
}

function issueText(issue: Issue): string {
  const label = ISSUE_STATUS_LABELS[issue.status];
  if (issue.status === "concluida") return "marcada como Concluída";
  if (issue.impeditiva && issue.status !== "cancelada") return `impeditiva com status ${label}`;
  return `status atual ${label}`;
}

export function useActivityLog(activities: Activity[], issues: Issue[]): LogEntry[] {
  return useMemo(() => {
    const activityEntries: LogEntry[] = activities.map((activity) => ({
      id: `activity-${activity.id}`,
      icon: activityIcon(activity),
      refId: activity.id,
      refName: activity.name,
      text: activityText(activity),
      authorInitials: "",
      authorName: activity.tester,
      at: activityTimestamp(activity),
    }));

    const issueEntries: LogEntry[] = issues.map((issue) => ({
      id: `issue-${issue.id}`,
      icon: issue.impeditiva ? "block" : "issue",
      refId: issue.id,
      refName: issue.title,
      text: issueText(issue),
      authorInitials: "",
      authorName: issue.tester,
      at: issueTimestamp(issue),
    }));

    return [...activityEntries, ...issueEntries]
      .filter((entry) => !Number.isNaN(new Date(entry.at).getTime()))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 7);
  }, [activities, issues]);
}
