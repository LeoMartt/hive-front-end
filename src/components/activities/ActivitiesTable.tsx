import Table from "react-bootstrap/Table";
import ActivityTreeRows from "./ActivityTreeRows";
import ActivityGroupRows from "./ActivityGroupRows";
import EmptyState from "../common/EmptyState";
import { groupByModuleProcess, groupByStatus, groupByTester } from "../../utils/groupActivities";
import type { Activity, ActivityGroupMode } from "../../types/activity";

interface ActivitiesTableProps {
  activities: Activity[];
  projectId: string;
  groupMode: ActivityGroupMode;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
}

export default function ActivitiesTable({
  activities,
  projectId,
  groupMode,
  expandedModules,
  onToggleModule,
}: ActivitiesTableProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="Nenhuma atividade encontrada"
        description="Ajuste os filtros para encontrar a atividade que procura."
      />
    );
  }

  return (
    <Table hover responsive className="align-middle mb-0">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Status</th>
          <th>Tester</th>
          <th>Dev</th>
          <th>Planejado</th>
          <th>Real</th>
          <th>Predecessores</th>
          <th className="text-center">Reteste</th>
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
          />
        )}
        {groupMode === "tester" && <ActivityGroupRows groups={groupByTester(activities)} projectId={projectId} />}
        {groupMode === "status" && <ActivityGroupRows groups={groupByStatus(activities)} projectId={projectId} />}
      </tbody>
    </Table>
  );
}
