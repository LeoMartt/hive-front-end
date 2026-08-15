import { useMemo, useState } from "react";
import { useParams } from "react-router";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import NavIcon from "../components/common/NavIcon";
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
    dateRangeEnabled: false,
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
  const [groupMode, setGroupModeState] = useState<ActivityGroupMode>("tree");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  // Processos nascem expandidos (igual ao mockup): guardamos só os que foram recolhidos.
  const [collapsedProcesses, setCollapsedProcesses] = useState<Set<string>>(new Set());
  // Grupos de "Por Tester"/"Por Status" nascem recolhidos, igual a Módulo na Árvore.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function setGroupMode(mode: ActivityGroupMode) {
    setGroupModeState(mode);
    setExpandedGroups(new Set());
  }

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

  function toggleProcess(processKey: string) {
    setCollapsedProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(processKey)) {
        next.delete(processKey);
      } else {
        next.add(processKey);
      }
      return next;
    });
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  const moduleGroups = useMemo(() => groupByModuleProcess(filteredActivities), [filteredActivities]);
  const allModulesExpanded = moduleGroups.length > 0 && moduleGroups.every((group) => expandedModules.has(group.module));

  function toggleAllModules() {
    if (allModulesExpanded) {
      setExpandedModules(new Set());
    } else {
      setExpandedModules(new Set(moduleGroups.map((group) => group.module)));
    }
  }

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">Atividades</div>
          <div className="page-desc compact">
            Mostrando {filteredActivities.length} de {activities.length} atividades
          </div>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline-secondary btn-sm">
            <NavIcon>
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </NavIcon>
            Exportar atividades
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm">
            Importar em massa
          </button>
          <button type="button" className="btn btn-primary btn-sm">
            + Nova atividade
          </button>
        </div>
      </div>

      <ActivityStatChips stats={stats} activeChip={activeChip} onSelect={handleChipSelect} />

      <ActivityFiltersBar activities={activities} filters={filters} onFiltersChange={updateFilters} />

      <div className="activities-toolbar">
        <div className="activities-toolbar-group">
          <ActivityGroupToggle mode={groupMode} onChange={setGroupMode} />
          {groupMode === "tree" && (
            <button type="button" className="btn btn-sm" onClick={toggleAllModules}>
              {allModulesExpanded ? "Fechar todos os módulos" : "Abrir todos os módulos"}
            </button>
          )}
        </div>
        <div className="activities-toolbar-group">
          <label className={`toggle-pill${filters.onlyMine ? " toggle-pill-active" : ""}`} htmlFor="only-mine-toggle">
            <span className="switch">
              <input
                type="checkbox"
                id="only-mine-toggle"
                checked={filters.onlyMine}
                onChange={(event) => updateFilters({ onlyMine: event.target.checked })}
              />
              <span className="track" />
            </span>
            Minhas atividades
          </label>
        </div>
      </div>

      <ActivitiesTable
        activities={filteredActivities}
        projectId={projectId}
        groupMode={groupMode}
        expandedModules={expandedModules}
        onToggleModule={toggleModule}
        collapsedProcesses={collapsedProcesses}
        onToggleProcess={toggleProcess}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
      />
    </div>
  );
}
