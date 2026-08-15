import Dropdown from "../common/Dropdown";
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

  function clearAll() {
    onModulesChange([]);
    onProcessesChange([]);
  }

  return (
    <Dropdown
      closeOnMenuClick={false}
      menuClassName="multi-select-menu"
      toggle={({ toggle }) => (
        <button
          type="button"
          id="module-process-filter-toggle"
          className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
          onClick={toggle}
        >
          Módulo/Processo
          {hasValue && <span className="filter-count">{selectedCount}</span>}
          <NavIcon className="multi-select-toggle-chevron">
            <path d="m6 9 6 6 6-6" />
          </NavIcon>
        </button>
      )}
    >
      {moduleOptions.map((moduleOption) => (
        <div className="multi-select-item" key={moduleOption.module}>
          <label htmlFor={`module-filter-${toSafeIdPart(moduleOption.module)}`}>
            <input
              type="checkbox"
              id={`module-filter-${toSafeIdPart(moduleOption.module)}`}
              checked={selectedModules.includes(moduleOption.module)}
              onChange={() => toggleModule(moduleOption.module)}
            />
            {moduleOption.module}
            <span className="dd-opt-count">{moduleOption.count}</span>
          </label>
          <div className="module-process-filter-children">
            {moduleOption.processes.map((processOption) => (
              <label
                key={processOption.process}
                htmlFor={`process-filter-${toSafeIdPart(moduleOption.module)}-${toSafeIdPart(processOption.process)}`}
              >
                <input
                  type="checkbox"
                  id={`process-filter-${toSafeIdPart(moduleOption.module)}-${toSafeIdPart(processOption.process)}`}
                  checked={selectedProcesses.includes(processOption.process)}
                  onChange={() => toggleProcess(processOption.process)}
                />
                {processOption.process}
                <span className="dd-opt-count">{processOption.count}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="dd-foot">
        <button type="button" className="dd-clear" onClick={clearAll}>
          Limpar
        </button>
      </div>
    </Dropdown>
  );
}
