import { useState } from "react";
import Dropdown from "../common/Dropdown";
import { toSafeIdPart } from "../../utils/domId";
import NavIcon from "../common/NavIcon";

export interface MultiSelectOption {
  value: string;
  label: string;
  count: number;
}

interface MultiSelectFilterProps {
  idPrefix: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  /** Mostra a contagem de cada opção (usado no mockup só em Status e Módulo/Processo). */
  showOptionCounts?: boolean;
}

export default function MultiSelectFilter({
  idPrefix,
  label,
  options,
  selected,
  onChange,
  searchable = false,
  showOptionCounts = false,
}: MultiSelectFilterProps) {
  const [search, setSearch] = useState("");

  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const hasValue = selected.length > 0;

  return (
    <Dropdown
      closeOnMenuClick={false}
      menuClassName="multi-select-menu"
      toggle={({ toggle: toggleOpen }) => (
        <button
          type="button"
          id={`${idPrefix}-toggle`}
          className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
          onClick={toggleOpen}
        >
          {label}
          {hasValue && <span className="filter-count">{selected.length}</span>}
          <NavIcon className="multi-select-toggle-chevron">
            <path d="m6 9 6 6 6-6" />
          </NavIcon>
        </button>
      )}
    >
      {searchable && (
        <div className="dd-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Pesquisar…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      )}
      {visibleOptions.length === 0 && <div className="multi-select-empty">Nenhuma opção encontrada.</div>}
      {visibleOptions.map((option) => (
        <div className="multi-select-item" key={option.value}>
          <label htmlFor={`${idPrefix}-${toSafeIdPart(option.value)}`}>
            <input
              type="checkbox"
              id={`${idPrefix}-${toSafeIdPart(option.value)}`}
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.label}
            {showOptionCounts && <span className="dd-opt-count">{option.count}</span>}
          </label>
        </div>
      ))}
      <div className="dd-foot">
        <button type="button" className="dd-clear" onClick={() => onChange([])}>
          Limpar
        </button>
      </div>
    </Dropdown>
  );
}
