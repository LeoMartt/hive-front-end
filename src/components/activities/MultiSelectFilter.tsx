import { useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import { toSafeIdPart } from "../../utils/domId";

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
}

export default function MultiSelectFilter({
  idPrefix,
  label,
  options,
  selected,
  onChange,
  searchable = false,
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

  const toggleLabel = selected.length === 0 ? label : `${label} (${selected.length})`;

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle id={`${idPrefix}-toggle`} variant="outline-secondary" size="sm" className="multi-select-toggle">
        {toggleLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {searchable && (
          <Form.Control
            type="text"
            placeholder="Pesquisar…"
            className="mx-2 mb-2 multi-select-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
        {visibleOptions.length === 0 && (
          <Dropdown.ItemText className="text-body-secondary small">Nenhuma opção encontrada.</Dropdown.ItemText>
        )}
        {visibleOptions.map((option) => (
          <Dropdown.ItemText key={option.value} className="multi-select-item">
            <Form.Check
              type="checkbox"
              id={`${idPrefix}-${toSafeIdPart(option.value)}`}
              label={`${option.label} (${option.count})`}
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
          </Dropdown.ItemText>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
