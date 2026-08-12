import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import type { ModuleGroup } from "../../types/activity";

interface ActivityTreeRowsProps {
  groups: ModuleGroup[];
  projectId: string;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
}

function countCompleted(activities: { status: string }[]): number {
  return activities.filter((activity) => activity.status === "concluido").length;
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
              <td colSpan={9}>
                <span className="activity-group-toggle-icon">{isExpanded ? "▾" : "▸"}</span>{" "}
                <span className="fw-semibold">{moduleGroup.module}</span>{" "}
                <span className="text-body-secondary small">
                  {countCompleted(activitiesInModule)}/{activitiesInModule.length} concluídas
                </span>
              </td>
            </tr>
            {isExpanded &&
              moduleGroup.processes.map((processGroup) => (
                <Fragment key={processGroup.process}>
                  <tr className="activity-group-row activity-group-row-process">
                    <td colSpan={9}>
                      <span className="fw-semibold small">{processGroup.process}</span>{" "}
                      <span className="text-body-secondary small">
                        {countCompleted(processGroup.activities)}/{processGroup.activities.length} concluídas
                      </span>
                    </td>
                  </tr>
                  {processGroup.activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} projectId={projectId} />
                  ))}
                </Fragment>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
