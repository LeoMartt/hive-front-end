import type { Activity, ActivityFiltersState } from "../types/activity";
import { isOverdue } from "./activityIndicators";

export interface CurrentUserMatcher {
  name: string;
  id?: string;
  email?: string;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function namesMatch(personName: string, currentUserName: string): boolean {
  const person = normalizeText(personName);
  const current = normalizeText(currentUserName);
  if (!person || !current) return false;
  if (person === current) return true;

  const currentTokens = current.split(/\s+/).filter((token) => token.length > 1);
  return currentTokens.length > 0 && currentTokens.every((token) => person.includes(token));
}

function belongsToCurrentUser(activity: Activity, currentUser: CurrentUserMatcher): boolean {
  const normalizedEmail = currentUser.email?.toLowerCase();
  return (
    activity.testerId === currentUser.id ||
    activity.developerId === currentUser.id ||
    (normalizedEmail !== undefined &&
      (activity.testerId?.toLowerCase() === normalizedEmail || activity.developerId?.toLowerCase() === normalizedEmail)) ||
    namesMatch(activity.tester, currentUser.name) ||
    namesMatch(activity.dev, currentUser.name)
  );
}

export function filterActivities(
  activities: Activity[],
  filters: ActivityFiltersState,
  currentUser: CurrentUserMatcher
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
    if (filters.dateRangeEnabled) {
      const plannedStart = activity.plannedStart.slice(0, 10);
      const plannedEnd = activity.plannedEnd.slice(0, 10);
      if (filters.plannedEndFrom && plannedEnd < filters.plannedEndFrom) {
        return false;
      }
      if (filters.plannedEndTo && plannedStart > filters.plannedEndTo) {
        return false;
      }
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
    if (filters.onlyMine && !belongsToCurrentUser(activity, currentUser)) {
      return false;
    }
    if (filters.onlyOverdue && !isOverdue(activity)) {
      return false;
    }
    return true;
  });
}
