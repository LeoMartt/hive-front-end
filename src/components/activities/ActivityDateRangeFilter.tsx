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
            disabled={!enabled}
            value={from ?? ""}
            onChange={(event) => onChange({ plannedEndFrom: event.target.value || null })}
            aria-label="Conclusão planejada a partir de"
          />
        </div>
        <div className="date-range-field">
          <div className="date-range-field-label">Até</div>
          <input
            type="date"
            className="filter-date-input"
            disabled={!enabled}
            value={to ?? ""}
            onChange={(event) => onChange({ plannedEndTo: event.target.value || null })}
            aria-label="Conclusão planejada até"
          />
        </div>
      </div>
      {!enabled && <div className="date-range-hint">Desativado: mostra todas as datas</div>}
    </Dropdown>
  );
}
