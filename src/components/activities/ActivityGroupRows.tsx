import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import TreeToggleIcon from "../common/TreeToggleIcon";
import { computeGroupRollup } from "../../utils/activityIndicators";
import type { FlatActivityGroup } from "../../types/activity";

interface ActivityGroupRowsProps {
  groups: FlatActivityGroup[];
  projectId: string;
  expandedGroups: Set<string>;
  onToggleGroup: (groupKey: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export default function ActivityGroupRows({
  groups,
  projectId,
  expandedGroups,
  onToggleGroup,
  selectedIds,
  onToggleSelect,
}: ActivityGroupRowsProps) {
  return (
    <>
      {groups.map((group) => {
        const { done, total, late, percent } = computeGroupRollup(group.activities);
        const isExpanded = expandedGroups.has(group.key);

        return (
          <Fragment key={group.key}>
            <tr
              role="button"
              tabIndex={0}
              className="activity-group-row"
              onClick={() => onToggleGroup(group.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleGroup(group.key);
                }
              }}
            >
              <td></td>
              <td className="activity-group-toggle-icon">
                <TreeToggleIcon expanded={isExpanded} />
              </td>
              <td colSpan={2}>
                <b>{group.label}</b>
              </td>
              <td colSpan={10}>
                {total === 0 ? (
                  <span className="rc" style={{ color: "var(--text-faint)" }}>
                    Sem atividades ativas
                  </span>
                ) : (
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
                )}
              </td>
            </tr>
            {isExpanded &&
              group.activities.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  projectId={projectId}
                  showBreadcrumb
                  checked={selectedIds.has(activity.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
