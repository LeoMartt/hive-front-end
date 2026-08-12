import type { Activity, ActivityFiltersState } from "../types/activity";
import { isOverdue } from "./activityIndicators";

export function filterActivities(
  activities: Activity[],
  filters: ActivityFiltersState,
  currentUserName: string
): Activity[] {
  const query = filters.search.trim().toLowerCase();

  return activities.filter((activity) => {
    if (query) {
      const matchesName = activity.name.toLowerCase().includes(query);
      const matchesId = activity.id.toLowerCase().includes(query);
      if (!matchesName && !matchesId) return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(activity.status)) {
      return false;
    }
    if (filters.testers.length > 0 && !filters.testers.includes(activity.tester)) {
      return false;
    }
    if (filters.devs.length > 0 && !filters.devs.includes(activity.dev)) {
      return false;
    }
    if (filters.plannedEndFrom && activity.plannedEnd.slice(0, 10) < filters.plannedEndFrom) {
      return false;
    }
    if (filters.plannedEndTo && activity.plannedEnd.slice(0, 10) > filters.plannedEndTo) {
      return false;
    }
    if (filters.retestBuckets.length > 0) {
      const bucket = activity.retestCount >= 3 ? 3 : activity.retestCount;
      if (!filters.retestBuckets.includes(bucket)) return false;
    }
    if (filters.modules.length > 0 && !filters.modules.includes(activity.module)) {
      return false;
    }
    if (filters.processes.length > 0 && !filters.processes.includes(activity.process)) {
      return false;
    }
    if (filters.onlyMine && activity.tester !== currentUserName && activity.dev !== currentUserName) {
      return false;
    }
    if (filters.onlyOverdue && !isOverdue(activity)) {
      return false;
    }
    return true;
  });
}
