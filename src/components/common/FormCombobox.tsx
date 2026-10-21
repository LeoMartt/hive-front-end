import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import Dropdown from "./Dropdown";
import Avatar from "./Avatar";

interface FormComboboxProps {
  id: string;
  value: string;
  options: { value: string; label: string; email?: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  allowCustom?: boolean;
  disabled?: boolean;
}

export default function FormCombobox({
  id, value, options, onChange, placeholder, allowCustom = false, disabled = false,
}: FormComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected ? `${selected.label}${selected.email ? ` (${selected.email})` : ""}` : "";
  const visible = options.filter((option) => `${option.label} ${option.email ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  useEffect(() => {
    if (open && active >= 0) {
      listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [active, open]);

  function select(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
    setActive(-1);
  }

  return (
    <Dropdown
      className="form-combobox"
      menuClassName="form-combobox-menu"
      open={open && !disabled}
      onOpenChange={(next) => { setOpen(next); setQuery(""); setActive(-1); }}
      toggle={() => (
        <div className="form-combobox-control">
          <input
            id={id}
            className="form-input"
            role="combobox"
            autoComplete="off"
            aria-expanded={open && !disabled}
            aria-controls={`${id}-options`}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
            disabled={disabled}
            placeholder={placeholder}
            value={allowCustom ? value : open ? query : selectedLabel}
            onFocus={() => { setOpen(true); setQuery(""); setActive(-1); }}
            onClick={() => { if (!open) { setOpen(true); setQuery(""); setActive(-1); } }}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget)) setOpen(false);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
              setOpen(true);
              if (allowCustom) onChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && open) {
                event.stopPropagation();
                setOpen(false);
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                const direction = event.key === "ArrowDown" ? 1 : -1;
                setActive((previous) => visible.length ? (previous + direction + visible.length) % visible.length : -1);
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                if (visible[active]) select(visible[active].value);
              }
            }}
          />
          <ChevronDown size={14} aria-hidden="true" />
        </div>
      )}
    >
      <div ref={listRef} id={`${id}-options`} role="listbox" aria-labelledby={id}>
        {visible.map((option, index) => (
          <button
            type="button"
            role="option"
            tabIndex={-1}
            id={`${id}-option-${index}`}
            key={option.value}
            aria-selected={value === option.value}
            className={`dropdown-item form-combobox-option${active === index ? " active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => select(option.value)}
          >
            {option.email ? <>
              <Avatar name={option.label} personKey={option.email} className="team-member-av" alt="" />
              <span className="user-dropdown-item-text"><span className="user-dropdown-item-name">{option.label}</span><span className="user-dropdown-item-email">{option.email}</span></span>
            </> : <span>{option.label}</span>}
            {value === option.value && <Check size={14} aria-hidden="true" />}
          </button>
        ))}
        {!visible.length && <div className="form-combobox-empty">{allowCustom ? "Novo valor" : "Nenhuma opção encontrada"}</div>}
      </div>
    </Dropdown>
  );
}
