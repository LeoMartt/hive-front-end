import Button from "react-bootstrap/Button";
import type { ActivityGroupMode } from "../../types/activity";

interface ActivityGroupToggleProps {
  mode: ActivityGroupMode;
  onChange: (mode: ActivityGroupMode) => void;
}

const OPTIONS: { value: ActivityGroupMode; label: string }[] = [
  { value: "tree", label: "Árvore" },
  { value: "tester", label: "Tester" },
  { value: "status", label: "Status" },
];

export default function ActivityGroupToggle({ mode, onChange }: ActivityGroupToggleProps) {
  return (
    <div className="btn-group" role="group" aria-label="Agrupar por">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={mode === option.value ? "primary" : "outline-secondary"}
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
