import { useMemo } from "react";
import type { ActivitySummary as Activity } from "../types/activity";
import { parseLocalDate } from "../utils/activityIndicators";

export interface CurvaSData {
  labels: string[];
  planned: number[];
  plannedCounts: number[];
  realized: (number | null)[];
  realizedCounts: (number | null)[];
  total: number;
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
    return { labels: ["Hoje"], planned: [0], plannedCounts: [0], realized: [0], realizedCounts: [0], total: 0 };
  }

  const today = startOfDay(new Date());
  const plannedStartDates = relevantActivities
    .map((activity) => parseDate(activity.plannedStart))
    .filter((date): date is Date => date !== null);
  const start =
    plannedStartDates.length > 0 ? new Date(Math.min(...plannedStartDates.map((date) => date.getTime()))) : today;

  const plannedEndDates = relevantActivities
    .map((activity) => parseDate(activity.plannedEnd))
    .filter((date): date is Date => date !== null);
  const lastPlannedEnd =
    plannedEndDates.length > 0 ? new Date(Math.max(...plannedEndDates.map((date) => date.getTime()))) : start;
  const realizedEnd = today;
  const end = new Date(Math.max(lastPlannedEnd.getTime(), realizedEnd.getTime(), start.getTime()));
  const dayCount = daysBetween(start, end) + 1;
  const days = Array.from({ length: dayCount }, (_, index) => addDays(start, index));

  const labels = days.map(formatDayLabel);
  const plannedDeltas = new Map<number, number>();
  const realizedDeltas = new Map<number, number>();
  const addDelta = (map: Map<number, number>, date: Date) => map.set(date.getTime(), (map.get(date.getTime()) ?? 0) + 0.5);
  for (const activity of relevantActivities) {
    const plannedStart = parseDate(activity.plannedStart);
    const plannedEnd = parseDate(activity.plannedEnd);
    if (plannedStart && plannedEnd) {
      addDelta(plannedDeltas, new Date(Math.min(plannedStart.getTime(), plannedEnd.getTime())));
      addDelta(plannedDeltas, plannedEnd);
    }
    const actualStart = parseDate(activity.actualStart);
    const actualEnd = parseDate(activity.actualEnd);
    if (activity.status === "concluido") {
      const completedAt = new Date(Math.min(actualEnd?.getTime() ?? today.getTime(), today.getTime()));
      addDelta(realizedDeltas, actualStart ? new Date(Math.min(actualStart.getTime(), completedAt.getTime())) : completedAt);
      addDelta(realizedDeltas, completedAt);
    } else if (actualStart) {
      addDelta(realizedDeltas, actualStart);
    }
  }
  const beforeStart = (map: Map<number, number>) => [...map].reduce((sum, [at, value]) => sum + (at < start.getTime() ? value : 0), 0);
  let plannedValue = beforeStart(plannedDeltas);
  let realizedValue = beforeStart(realizedDeltas);
  const plannedCounts = days.map(day => {
    plannedValue += plannedDeltas.get(day.getTime()) ?? 0;
    return plannedValue;
  });
  const planned = plannedCounts.map((plannedCount) => percent(plannedCount, relevantActivities.length));
  const realizedCounts = days.map((day) => {
    realizedValue += realizedDeltas.get(day.getTime()) ?? 0;
    if (day.getTime() > realizedEnd.getTime()) {
      return null;
    }
    return realizedValue;
  });
  const realized = realizedCounts.map((realizedCount) =>
    realizedCount === null ? null : percent(realizedCount, relevantActivities.length),
  );

  return { labels, planned, plannedCounts, realized, realizedCounts, total: relevantActivities.length };
}

export function useCurvaSData(activities: Activity[]): CurvaSData {
  return useMemo(() => buildCurvaSData(activities), [activities]);
}
