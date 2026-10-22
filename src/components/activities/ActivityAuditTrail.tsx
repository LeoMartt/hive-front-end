import type { ActivityAuditEntry } from "../../utils/activityAuditTrail";

interface ActivityAuditTrailProps {
  entries: ActivityAuditEntry[];
}

export default function ActivityAuditTrail({ entries }: ActivityAuditTrailProps) {
  return (
    <>
      <div className="divider" />
      <div className="subhead">Trilha de auditoria</div>
      <div className="audit-trail">
        {entries.map((entry, index) => (
          <div key={index}>
            <span className="mono audit-trail-at">{new Date(entry.at).toLocaleString("pt-BR")}</span> — {entry.text}
            {entry.authorName && <span> · {entry.authorName}</span>}
            {entry.reason && <span> · {entry.reason}</span>}
          </div>
        ))}
      </div>
    </>
  );
}
