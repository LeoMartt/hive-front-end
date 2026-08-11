import Form from "react-bootstrap/Form";

interface ActivityDateRangeFilterProps {
  from: string | null;
  to: string | null;
  onFromChange: (value: string | null) => void;
  onToChange: (value: string | null) => void;
}

export default function ActivityDateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: ActivityDateRangeFilterProps) {
  return (
    <div className="d-flex align-items-center gap-1">
      <Form.Control
        type="date"
        size="sm"
        className="date-range-input"
        value={from ?? ""}
        onChange={(event) => onFromChange(event.target.value || null)}
        aria-label="Conclusão planejada a partir de"
      />
      <span className="text-body-secondary small">até</span>
      <Form.Control
        type="date"
        size="sm"
        className="date-range-input"
        value={to ?? ""}
        onChange={(event) => onToChange(event.target.value || null)}
        aria-label="Conclusão planejada até"
      />
    </div>
  );
}
