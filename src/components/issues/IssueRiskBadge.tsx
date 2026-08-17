import type { IssueRiskLevel } from "../../utils/issueIndicators";

const RISK_LABELS: Record<Exclude<IssueRiskLevel, null>, string> = {
  aceitavel: "Aceitável",
  alerta: "Em alerta",
  risco: "Em risco",
};

interface IssueRiskBadgeProps {
  risk: IssueRiskLevel;
}

export default function IssueRiskBadge({ risk }: IssueRiskBadgeProps) {
  if (risk === null) return <span>—</span>;
  return <span className={`risk-badge risk-badge-${risk}`}>{RISK_LABELS[risk]}</span>;
}
