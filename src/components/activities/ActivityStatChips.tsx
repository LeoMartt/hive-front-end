import type { ActivityStats } from "../../types/activity";

export type ActivityStatChipKey = "total" | "concluido" | "execucao" | "bloqueado" | "aguardando" | "atrasado";

interface ChipDefinition {
  key: ActivityStatChipKey;
  label: string;
}

const CHIPS: ChipDefinition[] = [
  { key: "total", label: "Total" },
  { key: "concluido", label: "Concluído" },
  { key: "execucao", label: "Em execução" },
  { key: "bloqueado", label: "Bloqueado" },
  { key: "aguardando", label: "Aguardando" },
  { key: "atrasado", label: "Atrasado" },
];

interface ActivityStatChipsProps {
  stats: ActivityStats;
  activeChip: ActivityStatChipKey;
  onSelect: (chip: ActivityStatChipKey) => void;
}

export default function ActivityStatChips({ stats, activeChip, onSelect }: ActivityStatChipsProps) {
  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={`stat-chip${activeChip === chip.key ? " stat-chip-active" : ""}`}
          onClick={() => onSelect(chip.key)}
        >
          <span className="stat-chip-label">{chip.label}</span>
          <span className="stat-chip-value font-monospace">{stats[chip.key]}</span>
        </button>
      ))}
    </div>
  );
}
