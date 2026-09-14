import { useMemo } from "react";
import type { Activity } from "../types/activity";

export interface CurvaSData {
  labels: string[];
  planned: number[];
  realized: (number | null)[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function weekIndex(date: Date, start: Date): number {
  return Math.max(0, Math.floor((date.getTime() - start.getTime()) / (7 * DAY_MS)));
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function buildCurvaSData(activities: Activity[]): CurvaSData {
  const relevantActivities = activities.filter((activity) => activity.status !== "cancelado");
  if (relevantActivities.length === 0) {
    return { labels: ["Sem 1"], planned: [0], realized: [0] };
  }

  const dates = relevantActivities
    .flatMap((activity) => [parseDate(activity.plannedEnd), parseDate(activity.actualEnd)])
    .filter((date): date is Date => date !== null);
  const start = dates.length > 0 ? new Date(Math.min(...dates.map((date) => date.getTime()))) : startOfDay(new Date());
  const end = dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : start;
  const weekCount = Math.max(1, weekIndex(end, start) + 1);

  const labels = Array.from({ length: weekCount }, (_, index) => `Sem ${index + 1}`);
  const planned = labels.map((_, index) => {
    const plannedCount = relevantActivities.filter((activity) => {
      const plannedEnd = parseDate(activity.plannedEnd);
      return plannedEnd !== null && weekIndex(plannedEnd, start) <= index;
    }).length;
    return percent(plannedCount, relevantActivities.length);
  });
  const realized = labels.map((_, index) => {
    const realizedCount = relevantActivities.filter((activity) => {
      const actualEnd = parseDate(activity.actualEnd);
      return actualEnd !== null && weekIndex(actualEnd, start) <= index;
    }).length;
    return percent(realizedCount, relevantActivities.length);
  });

  return { labels, planned, realized };
}

export function useCurvaSData(activities: Activity[]): CurvaSData {
  return useMemo(() => buildCurvaSData(activities), [activities]);
}
