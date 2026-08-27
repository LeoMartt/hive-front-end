import { useEffect, useRef, useState } from "react";
import ActivityTreeRows from "./ActivityTreeRows";
import ActivityGroupRows from "./ActivityGroupRows";
import ConcludeActivityModal from "./ConcludeActivityModal";
import CancelActivitiesModal from "./CancelActivitiesModal";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
import { groupByModuleProcess, groupByStatus, groupByTester } from "../../utils/groupActivities";
import { isBulkApprovable, isBulkSelectable } from "../../utils/activityIndicators";
import type { Activity, ActivityGroupMode, ConcludeActivityInput } from "../../types/activity";

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
  currentUserName: string;
  onBulkApprove: (activityIds: string[], input: ConcludeActivityInput) => void;
  onBulkCancel: (activityIds: string[]) => void;
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
  currentUserName,
  onBulkApprove,
  onBulkCancel,
}: ActivitiesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Só atividades elegíveis (nem concluído, nem cancelado) entram na seleção via
  // "selecionar tudo" — elas nem têm checkbox próprio na linha (ver ActivityRow).
  const selectableIds = activities.filter(isBulkSelectable).map((activity) => activity.id);
  const selectedSelectableCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = selectableIds.length > 0 && selectedSelectableCount === selectableIds.length;
  const someSelected = selectedSelectableCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Descarta seleções de atividades que saíram da lista filtrada ou deixaram de ser elegíveis.
  useEffect(() => {
    setSelectedIds((prev) => {
      const selectable = new Set(selectableIds);
      const next = new Set([...prev].filter((id) => selectable.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  const selectedActivities = activities.filter((activity) => selectedIds.has(activity.id));
  const canBulkApprove = selectedActivities.length > 1 && selectedActivities.every(isBulkApprovable);

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
    setSelectedIds(checked ? new Set(selectableIds) : new Set());
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
            {selectedActivities.length > 1 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!canBulkApprove}
                title={
                  canBulkApprove
                    ? undefined
                    : "Só é possível aprovar em massa atividades em execução ou liberadas."
                }
                onClick={() => setShowBulkApproveModal(true)}
              >
                Aprovação em Massa
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowCancelModal(true)}>
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

      <ConcludeActivityModal
        show={showBulkApproveModal}
        onHide={() => setShowBulkApproveModal(false)}
        currentUserName={currentUserName}
        title={`Aprovar ${selectedActivities.length} atividade(s) selecionada(s)`}
        subtitle="Uma única evidência será aplicada a todas as atividades selecionadas do lote."
        onSubmit={(input) => {
          onBulkApprove(Array.from(selectedIds), input);
          clearSelection();
        }}
      />

      <CancelActivitiesModal
        show={showCancelModal}
        count={selectedIds.size}
        onHide={() => setShowCancelModal(false)}
        onConfirm={() => {
          onBulkCancel(Array.from(selectedIds));
          setShowCancelModal(false);
          clearSelection();
        }}
      />
    </>
  );
}
