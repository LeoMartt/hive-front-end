import Dropdown from "../common/Dropdown";
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

  function handleFromChange(value: string) {
    const plannedEndFrom = value || null;
    onChange({ plannedEndFrom, dateRangeEnabled: Boolean(plannedEndFrom || to) });
  }

  function handleToChange(value: string) {
    const plannedEndTo = value || null;
    onChange({ plannedEndTo, dateRangeEnabled: Boolean(from || plannedEndTo) });
  }

  return (
    <Dropdown
      closeOnMenuClick={false}
      menuClassName="multi-select-menu date-range-menu"
      toggle={({ toggle }) => (
        <button
          type="button"
          id="date-range-filter-toggle"
          className={`multi-select-toggle${enabled ? " has-value" : ""}`}
          onClick={toggle}
        >
          Período
          <NavIcon className="multi-select-toggle-chevron">
            <path d="m6 9 6 6 6-6" />
          </NavIcon>
        </button>
      )}
    >
      <div className="date-toggle-row">
        <span className="date-toggle-label">Usar período customizado</span>
        <span className="switch">
          <input
            type="checkbox"
            id="date-range-enabled"
            aria-label="Usar período customizado"
            checked={enabled}
            onChange={(event) => handleEnabledChange(event.target.checked)}
          />
          <span className="track" />
        </span>
      </div>
      <div className="date-range-fields">
        <div className="date-range-field">
          <div className="date-range-field-label">De</div>
          <input
            type="date"
            className="filter-date-input"
            value={from ?? ""}
            onChange={(event) => handleFromChange(event.target.value)}
            aria-label="Conclusão planejada a partir de"
          />
        </div>
        <div className="date-range-field">
          <div className="date-range-field-label">Até</div>
          <input
            type="date"
            className="filter-date-input"
            value={to ?? ""}
            onChange={(event) => handleToChange(event.target.value)}
            aria-label="Conclusão planejada até"
          />
        </div>
      </div>
      {!enabled && <div className="date-range-hint">Selecione uma data para ativar o filtro.</div>}
    </Dropdown>
  );
}
