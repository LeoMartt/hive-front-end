import { useEffect, useRef, useState } from "react";
import ActivityTreeRows from "./ActivityTreeRows";
import ActivityGroupRows from "./ActivityGroupRows";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
import { groupByModuleProcess, groupByStatus, groupByTester } from "../../utils/groupActivities";
import type { Activity, ActivityGroupMode } from "../../types/activity";

interface ActivitiesTableProps {
  activities: Activity[];
  projectId: string;
  groupMode: ActivityGroupMode;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
  collapsedProcesses: Set<string>;
  onToggleProcess: (processKey: string) => void;
  expandedGroups: Set<string>;
  onToggleGroup: (groupKey: string) => void;
}

export default function ActivitiesTable({
  activities,
  projectId,
  groupMode,
  expandedModules,
  onToggleModule,
  collapsedProcesses,
  onToggleProcess,
  expandedGroups,
  onToggleGroup,
}: ActivitiesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const visibleIds = activities.map((activity) => activity.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Descarta seleções de atividades que saíram da lista filtrada.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visibleIds) : new Set());
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  if (activities.length === 0) {
    return (
      <div className="table-wrap dense">
        <EmptyState
          title="Nenhuma atividade encontrada"
          description="Ajuste os filtros para encontrar a atividade que procura."
        />
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <span className="sel-count">
            <b>{selectedIds.size}</b> atividade(s) selecionada(s)
          </span>
          <div className="sel-actions">
            {/* No mockup, aprovação em massa só faz sentido com 2+ atividades selecionadas. */}
            {selectedIds.size > 1 && (
              <button type="button" className="btn btn-primary btn-sm">
                Aprovação em Massa
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm">
              Cancelar selecionadas
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearSelection}>
              Limpar seleção
            </button>
          </div>
        </div>
      )}
      <div className="table-wrap dense">
        <table>
          <thead>
            <tr>
              <th style={{ width: 26 }}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Selecionar todas as atividades visíveis"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                />
              </th>
              <th style={{ width: 26 }}></th>
              <th>
                Nome{" "}
                <span className="sort-icon">
                  <SortIcon />
                </span>
              </th>
              <th>ID</th>
              <th>
                Status{" "}
                <span className="sort-icon">
                  <SortIcon />
                </span>
              </th>
              <th>Tester</th>
              <th>Dev</th>
              <th>
                Início plan.{" "}
                <span className="sort-icon">
                  <SortIcon />
                </span>
              </th>
              <th>
                Conclusão plan.{" "}
                <span className="sort-icon">
                  <SortIcon />
                </span>
              </th>
              <th>Início real</th>
              <th>Conclusão real</th>
              <th>Predec.</th>
              <th className="text-center">
                Reteste{" "}
                <span className="sort-icon">
                  <SortIcon />
                </span>
              </th>
              <th className="text-center">Issues</th>
            </tr>
          </thead>
          <tbody>
            {groupMode === "tree" && (
              <ActivityTreeRows
                groups={groupByModuleProcess(activities)}
                projectId={projectId}
                expandedModules={expandedModules}
                onToggleModule={onToggleModule}
                collapsedProcesses={collapsedProcesses}
                onToggleProcess={onToggleProcess}
                selectedIds={selectedIds}
                onToggleSelect={toggleOne}
              />
            )}
            {groupMode === "tester" && (
              <ActivityGroupRows
                groups={groupByTester(activities)}
                projectId={projectId}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                selectedIds={selectedIds}
                onToggleSelect={toggleOne}
              />
            )}
            {groupMode === "status" && (
              <ActivityGroupRows
                groups={groupByStatus(activities)}
                projectId={projectId}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                selectedIds={selectedIds}
                onToggleSelect={toggleOne}
              />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
