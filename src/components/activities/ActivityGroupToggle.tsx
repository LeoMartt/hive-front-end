import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
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
    <Dropdown>
      <Dropdown.Toggle as="button" id="group-toggle" className="multi-select-toggle has-value">
        Agrupar: {activeLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {OPTIONS.map((option) => (
          <Dropdown.ItemText key={option.value} className="multi-select-item">
            <Form.Check
              type="radio"
              name="group-mode"
              id={`group-mode-${option.value}`}
              label={option.description}
              checked={mode === option.value}
              onChange={() => onChange(option.value)}
            />
          </Dropdown.ItemText>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
