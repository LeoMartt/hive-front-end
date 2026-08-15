import { useMemo } from "react";
import MultiSelectFilter, { type MultiSelectOption } from "./MultiSelectFilter";
import ActivityModuleProcessFilter from "./ActivityModuleProcessFilter";
import ActivityDateRangeFilter from "./ActivityDateRangeFilter";
import { ACTIVITY_STATUS_LABELS } from "../../utils/activityIndicators";
import type { Activity, ActivityFiltersState, ActivityStatus } from "../../types/activity";

interface ActivityFiltersBarProps {
  activities: Activity[];
  filters: ActivityFiltersState;
  onFiltersChange: (partial: Partial<ActivityFiltersState>) => void;
}

const ALL_STATUSES: ActivityStatus[] = [
  "aguardando",
  "liberado",
  "execucao",
  "bloqueado",
  "concluido",
  "cancelado",
];

const RETEST_LABELS: Record<number, string> = {
  0: "0×",
  1: "1×",
  2: "2×",
  3: "3+×",
};

function countBy(activities: Activity[], getValue: (activity: Activity) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const value = getValue(activity);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export default function ActivityFiltersBar({ activities, filters, onFiltersChange }: ActivityFiltersBarProps) {
  const statusOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => activity.status);
    return ALL_STATUSES.map((status) => ({
      value: status,
      label: ACTIVITY_STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
    }));
  }, [activities]);

  const testerOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => activity.tester);
    return Array.from(counts.entries())
      .map(([tester, count]) => ({ value: tester, label: tester, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activities]);

  const devOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => activity.dev);
    return Array.from(counts.entries())
      .map(([dev, count]) => ({ value: dev, label: dev, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activities]);

  const retestOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => String(activity.retestCount >= 3 ? 3 : activity.retestCount));
    return [0, 1, 2, 3].map((bucket) => ({
      value: String(bucket),
      label: RETEST_LABELS[bucket],
      count: counts.get(String(bucket)) ?? 0,
    }));
  }, [activities]);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.statuses.length > 0 ||
    filters.testers.length > 0 ||
    filters.devs.length > 0 ||
    filters.plannedEndFrom !== null ||
    filters.plannedEndTo !== null ||
    filters.retestBuckets.length > 0 ||
    filters.modules.length > 0 ||
    filters.processes.length > 0;

  function clearAll() {
    onFiltersChange({
      search: "",
      statuses: [],
      testers: [],
      devs: [],
      dateRangeEnabled: false,
      plannedEndFrom: null,
      plannedEndTo: null,
      retestBuckets: [],
      modules: [],
      processes: [],
    });
  }

  return (
    <div className="filters-bar">
      <div className="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nome ou ID…"
          value={filters.search}
          onChange={(event) => onFiltersChange({ search: event.target.value })}
        />
      </div>
      <MultiSelectFilter
        idPrefix="status-filter"
        label="Status"
        options={statusOptions}
        selected={filters.statuses}
        onChange={(statuses) => onFiltersChange({ statuses: statuses as ActivityStatus[] })}
        showOptionCounts
      />
      <MultiSelectFilter
        idPrefix="tester-filter"
        label="Tester"
        options={testerOptions}
        selected={filters.testers}
        onChange={(testers) => onFiltersChange({ testers })}
        searchable
      />
      <MultiSelectFilter
        idPrefix="dev-filter"
        label="Dev"
        options={devOptions}
        selected={filters.devs}
        onChange={(devs) => onFiltersChange({ devs })}
        searchable
      />
      <ActivityDateRangeFilter
        enabled={filters.dateRangeEnabled}
        from={filters.plannedEndFrom}
        to={filters.plannedEndTo}
        onChange={onFiltersChange}
      />
      <MultiSelectFilter
        idPrefix="retest-filter"
        label="Retestes"
        options={retestOptions}
        selected={filters.retestBuckets.map(String)}
        onChange={(values) => onFiltersChange({ retestBuckets: values.map(Number) })}
      />
      <ActivityModuleProcessFilter
        activities={activities}
        selectedModules={filters.modules}
        selectedProcesses={filters.processes}
        onModulesChange={(modules) => onFiltersChange({ modules })}
        onProcessesChange={(processes) => onFiltersChange({ processes })}
      />
      {hasActiveFilters && (
        <button type="button" className="filters-clear-all" onClick={clearAll}>
          Limpar todos
        </button>
      )}
    </div>
  );
}
