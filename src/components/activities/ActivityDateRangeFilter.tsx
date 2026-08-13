import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import NavIcon from "../common/NavIcon";
import type { ActivityFiltersState } from "../../types/activity";

interface ActivityDateRangeFilterProps {
  enabled: boolean;
  from: string | null;
  to: string | null;
  onChange: (partial: Partial<ActivityFiltersState>) => void;
}

export default function ActivityDateRangeFilter({ enabled, from, to, onChange }: ActivityDateRangeFilterProps) {
  function handleEnabledChange(checked: boolean) {
    if (checked) {
      onChange({ dateRangeEnabled: true });
    } else {
      onChange({ dateRangeEnabled: false, plannedEndFrom: null, plannedEndTo: null });
    }
  }

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle as="button" id="date-range-filter-toggle" className={`multi-select-toggle${enabled ? " has-value" : ""}`}>
        Período
        <NavIcon className="multi-select-toggle-chevron">
          <path d="m6 9 6 6 6-6" />
        </NavIcon>
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu date-range-menu">
        <div className="date-toggle-row">
          <span className="date-toggle-label">Usar período customizado</span>
          <Form.Check
            type="switch"
            id="date-range-enabled"
            aria-label="Usar período customizado"
            checked={enabled}
            onChange={(event) => handleEnabledChange(event.target.checked)}
          />
        </div>
        <div className="d-flex gap-2">
          <Form.Group className="flex-fill">
            <Form.Label className="date-range-field-label">De</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              disabled={!enabled}
              value={from ?? ""}
              onChange={(event) => onChange({ plannedEndFrom: event.target.value || null })}
              aria-label="Conclusão planejada a partir de"
            />
          </Form.Group>
          <Form.Group className="flex-fill">
            <Form.Label className="date-range-field-label">Até</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              disabled={!enabled}
              value={to ?? ""}
              onChange={(event) => onChange({ plannedEndTo: event.target.value || null })}
              aria-label="Conclusão planejada até"
            />
          </Form.Group>
        </div>
        {!enabled && <div className="date-range-hint">Desativado: mostra todas as datas</div>}
      </Dropdown.Menu>
    </Dropdown>
  );
}
