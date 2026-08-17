import { ISSUE_STATUS_LABELS } from "../../utils/issueIndicators";
import type { IssueStatus } from "../../types/issue";

export type IssueStatusFilter = "todas" | IssueStatus;

const PILLS: { key: IssueStatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "aberta", label: ISSUE_STATUS_LABELS.aberta },
  { key: "em_analise", label: ISSUE_STATUS_LABELS.em_analise },
  { key: "solucao_proposta", label: ISSUE_STATUS_LABELS.solucao_proposta },
  { key: "concluida", label: ISSUE_STATUS_LABELS.concluida },
];

interface IssueStatusPillsProps {
  counts: Record<IssueStatusFilter, number>;
  active: IssueStatusFilter;
  onSelect: (status: IssueStatusFilter) => void;
}

export default function IssueStatusPills({ counts, active, onSelect }: IssueStatusPillsProps) {
  return (
    <div className="filter-pills-row">
      {PILLS.map((pill) => (
        <button
          key={pill.key}
          type="button"
          className={`filter-pill${active === pill.key ? " active" : ""}`}
          onClick={() => onSelect(pill.key)}
        >
          {pill.label} <span className="n">{counts[pill.key]}</span>
        </button>
      ))}
    </div>
  );
}
