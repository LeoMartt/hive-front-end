import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import ImportActivitiesModal from "../components/activities/ImportActivitiesModal";
import NewActivityModal from "../components/activities/NewActivityModal";
import NavIcon from "../components/common/NavIcon";
import { useActivities } from "../hooks/useActivities";
import { useExportButton } from "../hooks/useExportButton";
import { useProjects } from "../hooks/useProjects";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { ApiError, normalizeError } from "../api/apiError";
import { hierarchyApi } from "../api/resources/hierarchy";
import { useMocks } from "../config/env";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import { buildActivityExportRows, ACTIVITY_EXPORT_COLUMN_WIDTHS } from "../utils/activityExport";
import { downloadXlsx } from "../utils/downloadXlsx";
import type { ActivityFiltersState, ActivityGroupMode, NewActivityInput } from "../types/activity";
import type { HierarchyNode } from "../types/project";

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
  const { activities, stats, loading, error, createActivity, bulkConcludeActivities, cancelActivities, importActivities } =
    useActivities(projectId);
  const { projects } = useProjects();
  const { name: currentUserName } = useCurrentUser();
  const currentProject = projects.find((project) => project.id === projectId);
  const [hierarchyNodes, setHierarchyNodes] = useState<HierarchyNode[]>([]);
  const [hierarchyError, setHierarchyError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (useMocks || !projectId) return;
    let cancelled = false;
    hierarchyApi
      .list(projectId)
      .then((nodes) => {
        if (!cancelled) setHierarchyNodes(nodes);
      })
      .catch((err) => {
        if (!cancelled) setHierarchyError(err instanceof ApiError ? err : normalizeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    () => filterActivities(activities, filters, currentUserName),
    [activities, filters, currentUserName]
  );

  const {
    label: exportActivitiesLabel,
    isDefault: exportActivitiesIsDefault,
    handleClick: handleExportActivities,
  } = useExportButton(
    "Exportar atividades",
    filteredActivities.length === 0,
    "Nenhuma atividade no filtro atual",
    () =>
      downloadXlsx(
        buildActivityExportRows(filteredActivities),
        ACTIVITY_EXPORT_COLUMN_WIDTHS,
        "Atividades",
        "hive_atividades",
      ),
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

  function handleImportActivities(inputs: NewActivityInput[]) {
    inputs.forEach((input) => createActivity(input));
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
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportActivities}>
            {exportActivitiesIsDefault ? (
              <>
                <NavIcon>
                  <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                  <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </NavIcon>
                {exportActivitiesLabel}
              </>
            ) : (
              exportActivitiesLabel
            )}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowImportModal(true)}>
            Importar em massa
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNewActivityModal(true)}>
            + Nova atividade
          </button>
        </div>
      </div>

      <ActivityStatChips stats={stats} activeChip={activeChip} onSelect={handleChipSelect} />

      {loading && <div className="info-banner">Carregando atividades...</div>}
      {error && <div className="error-banner">{error.message}</div>}
      {hierarchyError && <div className="error-banner">{hierarchyError.message}</div>}

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
        currentUserName={currentUserName}
        onBulkApprove={bulkConcludeActivities}
        onBulkCancel={cancelActivities}
      />

      <NewActivityModal
        show={showNewActivityModal}
        onHide={() => setShowNewActivityModal(false)}
        team={currentProject?.team ?? []}
        hierarchyNodes={hierarchyNodes}
        projectMode={currentProject?.mode ?? null}
        onCreate={createActivity}
      />

      <ImportActivitiesModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        team={currentProject?.team ?? []}
        onImport={handleImportActivities}
        onImportFile={importActivities}
        useBackendImport={!useMocks}
      />
    </div>
  );
}
