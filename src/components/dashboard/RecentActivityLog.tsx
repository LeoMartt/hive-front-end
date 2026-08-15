import type { ReactNode } from "react";
import NavIcon from "../common/NavIcon";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import type { LogEntry, LogEntryIcon } from "../../types/activityLog";

const ICON_PATHS: Record<LogEntryIcon, ReactNode> = {
  status: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  block: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  done: <path d="M20 6 9 17l-5-5" />,
  issue: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
    </>
  ),
};

interface RecentActivityLogProps {
  entries: LogEntry[];
}

export default function RecentActivityLog({ entries }: RecentActivityLogProps) {
  return (
    <div className="panel log-panel">
      <div className="panel-head">
        <div className="panel-title">
          Atividades Recentes <span>últimas {entries.length} alterações em atividades e issues</span>
        </div>
      </div>
      <div>
        {entries.map((entry) => (
          <div className="log-row" key={entry.id}>
            <div className={`log-icon i-${entry.icon}`}>
              <NavIcon>{ICON_PATHS[entry.icon]}</NavIcon>
            </div>
            <div className="log-body">
              <div className="log-text">
                <span className="id">{entry.refId}</span> - <span className="log-name">{entry.refName}</span>:{" "}
                {entry.text}
              </div>
              <div className="log-meta">
                <span className="avatar-mini">{entry.authorInitials}</span>
                {entry.authorName} · {formatRelativeTime(entry.at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
