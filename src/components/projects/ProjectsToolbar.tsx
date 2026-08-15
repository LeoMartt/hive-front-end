import type { ProjectMode } from "../../types/project";

export type ProjectsTabFilter = "all" | ProjectMode;

interface ProjectsToolbarProps {
  activeTab: ProjectsTabFilter;
  onTabChange: (tab: ProjectsTabFilter) => void;
  counts: { all: number; uat: number; cutover: number };
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const TABS: { key: ProjectsTabFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "uat", label: "UAT" },
  { key: "cutover", label: "Cutover" },
];

export default function ProjectsToolbar({
  activeTab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
}: ProjectsToolbarProps) {
  return (
    <div className="toolbar">
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label} <span className="n">{counts[tab.key]}</span>
          </button>
        ))}
      </div>
      <div className="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Buscar projeto…"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}
