import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import type { Activity } from "../../types/activity";
import { toSafeIdPart } from "../../utils/domId";
import { groupByModuleProcess } from "../../utils/groupActivities";
import NavIcon from "../common/NavIcon";

interface ActivityModuleProcessFilterProps {
  activities: Activity[];
  selectedModules: string[];
  selectedProcesses: string[];
  onModulesChange: (modules: string[]) => void;
  onProcessesChange: (processes: string[]) => void;
}

interface ModuleOption {
  module: string;
  count: number;
  processes: { process: string; count: number }[];
}

function buildModuleOptions(activities: Activity[]): ModuleOption[] {
  return groupByModuleProcess(activities).map((group) => ({
    module: group.module,
    count: group.processes.reduce((sum, processGroup) => sum + processGroup.activities.length, 0),
    processes: group.processes.map((processGroup) => ({
      process: processGroup.process,
      count: processGroup.activities.length,
    })),
  }));
}

export default function ActivityModuleProcessFilter({
  activities,
  selectedModules,
  selectedProcesses,
  onModulesChange,
  onProcessesChange,
}: ActivityModuleProcessFilterProps) {
  const moduleOptions = buildModuleOptions(activities);
  const selectedCount = selectedModules.length + selectedProcesses.length;
  const toggleLabel = selectedCount === 0 ? "Módulo/Processo" : `Módulo/Processo (${selectedCount})`;
  const hasValue = selectedCount > 0;

  function toggleModule(moduleName: string) {
    onModulesChange(
      selectedModules.includes(moduleName)
        ? selectedModules.filter((item) => item !== moduleName)
        : [...selectedModules, moduleName]
    );
  }

  function toggleProcess(processName: string) {
    onProcessesChange(
      selectedProcesses.includes(processName)
        ? selectedProcesses.filter((item) => item !== processName)
        : [...selectedProcesses, processName]
    );
  }

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle
        id="module-process-filter-toggle"
        className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
      >
        {toggleLabel}
        <NavIcon className="multi-select-toggle-chevron">
          <path d="m6 9 6 6 6-6" />
        </NavIcon>
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {moduleOptions.map((moduleOption) => (
          <Dropdown.ItemText key={moduleOption.module} className="multi-select-item">
            <Form.Check
              type="checkbox"
              id={`module-filter-${toSafeIdPart(moduleOption.module)}`}
              label={`${moduleOption.module} (${moduleOption.count})`}
              checked={selectedModules.includes(moduleOption.module)}
              onChange={() => toggleModule(moduleOption.module)}
            />
            <div className="module-process-filter-children">
              {moduleOption.processes.map((processOption) => (
                <Form.Check
                  key={processOption.process}
                  type="checkbox"
                  id={`process-filter-${toSafeIdPart(moduleOption.module)}-${toSafeIdPart(processOption.process)}`}
                  label={`${processOption.process} (${processOption.count})`}
                  checked={selectedProcesses.includes(processOption.process)}
                  onChange={() => toggleProcess(processOption.process)}
                />
              ))}
            </div>
          </Dropdown.ItemText>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
