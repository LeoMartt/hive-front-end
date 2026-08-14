import type { ActivityStats } from "../../types/activity";

export type ActivityStatChipKey = "total" | "concluido" | "execucao" | "bloqueado" | "aguardando" | "atrasado";

type ChipTone = "" | "g" | "y" | "r";

interface ChipDefinition {
  key: ActivityStatChipKey;
  label: string;
  tone: ChipTone;
}

const CHIPS: ChipDefinition[] = [
  { key: "total", label: "Total", tone: "" },
  { key: "concluido", label: "Concluído", tone: "g" },
  { key: "execucao", label: "Em execução", tone: "y" },
  { key: "bloqueado", label: "Bloqueado", tone: "r" },
  { key: "aguardando", label: "Aguardando", tone: "" },
  { key: "atrasado", label: "Atrasado", tone: "r" },
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
          <span className={`stat-chip-value font-monospace${chip.tone ? ` stat-chip-value-${chip.tone}` : ""}`}>
            {stats[chip.key]}
          </span>
          <span className="stat-chip-label">{chip.label}</span>
        </button>
      ))}
    </div>
  );
}
