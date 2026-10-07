import { useMemo } from "react";
import type { Activity } from "../types/activity";
import { parseLocalDate } from "../utils/activityIndicators";

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
  const date = parseLocalDate(value);
  return date ? startOfDay(date) : null;
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildCurvaSData(activities: Activity[]): CurvaSData {
  const relevantActivities = activities.filter((activity) => activity.status !== "cancelado");
  if (relevantActivities.length === 0) {
    return { labels: ["Hoje"], planned: [0], realized: [0] };
  }

  const today = startOfDay(new Date());
  const createdDates = relevantActivities
    .map((activity) => parseDate(activity.createdAt ?? null))
    .filter((date): date is Date => date !== null);
  const plannedStartDates = relevantActivities
    .map((activity) => parseDate(activity.plannedStart))
    .filter((date): date is Date => date !== null);
  const start =
    createdDates.length > 0
      ? new Date(Math.min(...createdDates.map((date) => date.getTime())))
      : plannedStartDates.length > 0
        ? new Date(Math.min(...plannedStartDates.map((date) => date.getTime())))
        : today;

  const actualEndDates = relevantActivities
    .map((activity) => parseDate(activity.actualEnd))
    .filter((date): date is Date => date !== null);
  const lastActualEnd =
    actualEndDates.length > 0 ? new Date(Math.max(...actualEndDates.map((date) => date.getTime()))) : start;
  const end = new Date(Math.max(today.getTime(), lastActualEnd.getTime(), start.getTime()));
  const dayCount = daysBetween(start, end) + 1;
  const days = Array.from({ length: dayCount }, (_, index) => addDays(start, index));

  const labels = days.map(formatDayLabel);
  const planned = days.map((day) => {
    const plannedCount = relevantActivities.filter((activity) => {
      const plannedEnd = parseDate(activity.plannedEnd);
      return plannedEnd !== null && plannedEnd.getTime() <= day.getTime();
    }).length;
    return percent(plannedCount, relevantActivities.length);
  });
  const realized = days.map((day) => {
    const realizedCount = relevantActivities.filter((activity) => {
      const actualEnd = parseDate(activity.actualEnd);
      return actualEnd !== null && actualEnd.getTime() <= day.getTime();
    }).length;
    return percent(realizedCount, relevantActivities.length);
  });

  return { labels, planned, realized };
}

export function useCurvaSData(activities: Activity[]): CurvaSData {
  return useMemo(() => buildCurvaSData(activities), [activities]);
}
