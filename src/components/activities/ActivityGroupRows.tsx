import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import type { FlatActivityGroup } from "../../types/activity";

interface ActivityGroupRowsProps {
  groups: FlatActivityGroup[];
  projectId: string;
}

export default function ActivityGroupRows({ groups, projectId }: ActivityGroupRowsProps) {
  return (
    <>
      {groups.map((group) => (
        <Fragment key={group.key}>
          <tr className="activity-group-row">
            <td colSpan={9}>
              <span className="fw-semibold">{group.label}</span>{" "}
              <span className="text-body-secondary small">{group.activities.length} atividades</span>
            </td>
          </tr>
          {group.activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} projectId={projectId} />
          ))}
        </Fragment>
      ))}
    </>
  );
}
