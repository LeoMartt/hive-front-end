import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import type { ProjectMode } from "../../types/project";

export type ProjectsTabFilter = "all" | ProjectMode;

interface ProjectsToolbarProps {
  activeTab: ProjectsTabFilter;
  onTabChange: (tab: ProjectsTabFilter) => void;
  counts: { all: number; uat: number; cutover: number };
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function ProjectsToolbar({
  activeTab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
}: ProjectsToolbarProps) {
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
      <Nav
        variant="pills"
        activeKey={activeTab}
        onSelect={(key) => onTabChange((key ?? "all") as ProjectsTabFilter)}
      >
        <Nav.Item>
          <Nav.Link eventKey="all">
            Todos <span className="text-body-secondary">{counts.all}</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="uat">
            UAT <span className="text-body-secondary">{counts.uat}</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="cutover">
            Cutover <span className="text-body-secondary">{counts.cutover}</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Form.Control
        type="text"
        placeholder="Buscar projeto…"
        className="project-search-input"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>
  );
}
