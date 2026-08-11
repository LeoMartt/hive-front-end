import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import type { Activity } from "../../types/activity";

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
  const order: string[] = [];
  const map = new Map<string, Map<string, number>>();

  for (const activity of activities) {
    if (!map.has(activity.module)) {
      map.set(activity.module, new Map());
      order.push(activity.module);
    }
    const processMap = map.get(activity.module)!;
    processMap.set(activity.process, (processMap.get(activity.process) ?? 0) + 1);
  }

  return order.map((moduleName) => {
    const processMap = map.get(moduleName)!;
    const processes = Array.from(processMap.entries()).map(([process, count]) => ({ process, count }));
    const count = processes.reduce((sum, item) => sum + item.count, 0);
    return { module: moduleName, count, processes };
  });
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
      <Dropdown.Toggle id="module-process-filter-toggle" variant="outline-secondary" size="sm" className="multi-select-toggle">
        {toggleLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {moduleOptions.map((moduleOption) => (
          <Dropdown.ItemText key={moduleOption.module} className="multi-select-item">
            <Form.Check
              type="checkbox"
              id={`module-filter-${moduleOption.module}`}
              label={`${moduleOption.module} (${moduleOption.count})`}
              checked={selectedModules.includes(moduleOption.module)}
              onChange={() => toggleModule(moduleOption.module)}
            />
            <div className="module-process-filter-children">
              {moduleOption.processes.map((processOption) => (
                <Form.Check
                  key={processOption.process}
                  type="checkbox"
                  id={`process-filter-${moduleOption.module}-${processOption.process}`}
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
