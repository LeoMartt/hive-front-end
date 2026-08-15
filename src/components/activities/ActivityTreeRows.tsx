import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import TreeToggleIcon from "../common/TreeToggleIcon";
import TreeConnectorIcon from "../common/TreeConnectorIcon";
import { computeGroupRollup } from "../../utils/activityIndicators";
import type { Activity, ModuleGroup } from "../../types/activity";

interface ActivityTreeRowsProps {
  groups: ModuleGroup[];
  projectId: string;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
  collapsedProcesses: Set<string>;
  onToggleProcess: (processKey: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

function RollupCell({ activities }: { activities: Activity[] }) {
  const { done, total, late, percent } = computeGroupRollup(activities);

  if (total === 0) {
    return (
      <td colSpan={10}>
        <span className="rc" style={{ color: "var(--text-faint)" }}>
          Sem atividades ativas
        </span>
      </td>
    );
  }

  return (
    <td colSpan={10}>
      <div className="group-rollup">
        <span className="rc">
          {done}/{total} concluídas
        </span>
        <div className="mini-progress">
          <div className="mini-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        {late > 0 && (
          <span className="rc rc-late">
            {late} atrasada{late > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </td>
  );
}

export default function ActivityTreeRows({
  groups,
  projectId,
  expandedModules,
  onToggleModule,
  collapsedProcesses,
  onToggleProcess,
  selectedIds,
  onToggleSelect,
}: ActivityTreeRowsProps) {
  let processSeq = 0;

  return (
    <>
      {groups.map((moduleGroup, moduleIndex) => {
        const activitiesInModule = moduleGroup.processes.flatMap((process) => process.activities);
        const isExpanded = expandedModules.has(moduleGroup.module);
        const moduleId = `MOD-${String(moduleIndex + 1).padStart(2, "0")}`;

        return (
          <Fragment key={moduleGroup.module}>
            <tr
              role="button"
              tabIndex={0}
              className="activity-group-row"
              onClick={() => onToggleModule(moduleGroup.module)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleModule(moduleGroup.module);
                }
              }}
            >
              <td></td>
              <td className="activity-group-toggle-icon">
                <TreeToggleIcon expanded={isExpanded} />
              </td>
              <td>
                <div className="cell-name" title={moduleGroup.module}>
                  <b className="cell-name-text">{moduleGroup.module}</b>
                </div>
              </td>
              <td className="mono">{moduleId}</td>
              <RollupCell activities={activitiesInModule} />
            </tr>
            {isExpanded &&
              moduleGroup.processes.map((processGroup) => {
                processSeq += 1;
                const processId = `PRC-${String(processSeq).padStart(2, "0")}`;
                const processKey = `${moduleGroup.module}::${processGroup.process}`;
                const isProcessExpanded = !collapsedProcesses.has(processKey);

                return (
                  <Fragment key={processGroup.process}>
                    <tr
                      role="button"
                      tabIndex={0}
                      className="activity-group-row activity-group-row-process"
                      onClick={() => onToggleProcess(processKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onToggleProcess(processKey);
                        }
                      }}
                    >
                      <td></td>
                      <td className="activity-group-toggle-icon sub">
                        <TreeToggleIcon expanded={isProcessExpanded} />
                      </td>
                      <td>
                        <div className="cell-name" style={{ paddingLeft: 18 }} title={processGroup.process}>
                          <span className="lvl">
                            <TreeConnectorIcon />
                          </span>
                          <span className="cell-name-text">{processGroup.process}</span>
                        </div>
                      </td>
                      <td className="mono">{processId}</td>
                      <RollupCell activities={processGroup.activities} />
                    </tr>
                    {isProcessExpanded &&
                      processGroup.activities.map((activity) => (
                        <ActivityRow
                          key={activity.id}
                          activity={activity}
                          projectId={projectId}
                          indent
                          checked={selectedIds.has(activity.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      ))}
                  </Fragment>
                );
              })}
          </Fragment>
        );
      })}
    </>
  );
}
