import Dropdown from "../common/Dropdown";
import type { ActivityGroupMode } from "../../types/activity";

interface ActivityGroupToggleProps {
  mode: ActivityGroupMode;
  onChange: (mode: ActivityGroupMode) => void;
}

const OPTIONS: { value: ActivityGroupMode; label: string; description: string }[] = [
  { value: "tree", label: "Árvore", description: "Árvore (Módulo › Processo)" },
  { value: "tester", label: "Tester", description: "Por Tester" },
  { value: "status", label: "Status", description: "Por Status" },
];

export default function ActivityGroupToggle({ mode, onChange }: ActivityGroupToggleProps) {
  const activeLabel = OPTIONS.find((option) => option.value === mode)?.label ?? "";

  return (
    <Dropdown
      menuClassName="multi-select-menu"
      toggle={({ toggle }) => (
        <button type="button" id="group-toggle" className="multi-select-toggle" onClick={toggle}>
          Agrupar: {activeLabel}
        </button>
      )}
    >
      {OPTIONS.map((option) => (
        <div className="multi-select-item" key={option.value}>
          <label htmlFor={`group-mode-${option.value}`}>
            <input
              type="radio"
              name="group-mode"
              id={`group-mode-${option.value}`}
              checked={mode === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.description}
          </label>
        </div>
      ))}
    </Dropdown>
  );
}
