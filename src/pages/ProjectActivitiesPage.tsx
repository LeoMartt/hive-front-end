import { useMemo, useState } from "react";
import { useParams } from "react-router";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import { useActivities } from "../hooks/useActivities";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import type { ActivityFiltersState, ActivityGroupMode } from "../types/activity";

const CURRENT_USER_NAME = "Guilherme Fabretti";

function createEmptyFilters(): ActivityFiltersState {
  return {
    search: "",
    statuses: [],
    testers: [],
    devs: [],
    plannedEndFrom: null,
    plannedEndTo: null,
    retestBuckets: [],
    modules: [],
    processes: [],
    onlyMine: false,
    onlyOverdue: false,
  };
}

export default function ProjectActivitiesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { activities, stats } = useActivities(projectId);

  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
  const [groupMode, setGroupMode] = useState<ActivityGroupMode>("tree");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  function updateFilters(partial: Partial<ActivityFiltersState>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  const filteredActivities = useMemo(
    () => filterActivities(activities, filters, CURRENT_USER_NAME),
    [activities, filters]
  );

  const singleStatus = filters.statuses.length === 1 ? filters.statuses[0] : null;
  const activeChip: ActivityStatChipKey = filters.onlyOverdue
    ? "atrasado"
    : singleStatus && singleStatus !== "liberado" && singleStatus !== "cancelado"
      ? singleStatus
      : "total";

  function handleChipSelect(chip: ActivityStatChipKey) {
    if (chip === "total") {
      updateFilters({ statuses: [], onlyOverdue: false });
    } else if (chip === "atrasado") {
      updateFilters({ statuses: [], onlyOverdue: true });
    } else {
      updateFilters({ statuses: [chip], onlyOverdue: false });
    }
  }

  function toggleModule(moduleName: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  }

  function expandAllModules() {
    const allModules = groupByModuleProcess(filteredActivities).map((group) => group.module);
    setExpandedModules(new Set(allModules));
  }

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h1 className="h4 fw-bold mb-1">Atividades</h1>
          <p className="text-body-secondary small mb-0">
            Mostrando {filteredActivities.length} de {activities.length} atividades
          </p>
        </div>
      </div>

      <ActivityStatChips stats={stats} activeChip={activeChip} onSelect={handleChipSelect} />

      <ActivityFiltersBar activities={activities} filters={filters} onFiltersChange={updateFilters} />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <ActivityGroupToggle mode={groupMode} onChange={setGroupMode} />
        </div>
        <div className="d-flex align-items-center gap-3">
          {groupMode === "tree" && (
            <Button variant="outline-secondary" size="sm" onClick={expandAllModules}>
              Abrir todos os módulos
            </Button>
          )}
          <Form.Check
            type="switch"
            id="only-mine-toggle"
            label="Minhas atividades"
            checked={filters.onlyMine}
            onChange={(event) => updateFilters({ onlyMine: event.target.checked })}
          />
        </div>
      </div>

      <div className="card">
        <ActivitiesTable
          activities={filteredActivities}
          projectId={projectId}
          groupMode={groupMode}
          expandedModules={expandedModules}
          onToggleModule={toggleModule}
        />
      </div>
    </div>
  );
}
