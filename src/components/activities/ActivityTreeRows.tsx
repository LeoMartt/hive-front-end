import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import type { Activity, ModuleGroup } from "../../types/activity";

interface ActivityTreeRowsProps {
  groups: ModuleGroup[];
  projectId: string;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
}

function countCompleted(activities: Activity[]): number {
  return activities.filter((activity) => activity.status === "concluido").length;
}

function completedPercent(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  return Math.round((countCompleted(activities) / activities.length) * 100);
}

function RollupCell({ activities, label }: { activities: Activity[]; label: string }) {
  return (
    <td colSpan={12}>
      <div className="group-rollup">
        <span className="fw-semibold">{label}</span>
        <span className="text-body-secondary small">
          {countCompleted(activities)}/{activities.length} concluídas
        </span>
        <div className="mini-progress">
          <div className="mini-progress-fill" style={{ width: `${completedPercent(activities)}%` }} />
        </div>
      </div>
    </td>
  );
}

export default function ActivityTreeRows({
  groups,
  projectId,
  expandedModules,
  onToggleModule,
}: ActivityTreeRowsProps) {
  return (
    <>
      {groups.map((moduleGroup) => {
        const activitiesInModule = moduleGroup.processes.flatMap((process) => process.activities);
        const isExpanded = expandedModules.has(moduleGroup.module);

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
              <RollupCell
                activities={activitiesInModule}
                label={`${isExpanded ? "▾" : "▸"} ${moduleGroup.module}`}
              />
            </tr>
            {isExpanded &&
              moduleGroup.processes.map((processGroup) => (
                <Fragment key={processGroup.process}>
                  <tr className="activity-group-row activity-group-row-process">
                    <td></td>
                    <RollupCell activities={processGroup.activities} label={processGroup.process} />
                  </tr>
                  {processGroup.activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} projectId={projectId} indent />
                  ))}
                </Fragment>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
