import { NavLink, useParams } from "react-router";

const NAV_ITEMS = [
  { to: "dashboard", label: "Dashboard" },
  { to: "atividades", label: "Atividades" },
  { to: "estrutura", label: "Estrutura" },
  { to: "issues", label: "Issues" },
  { to: "config", label: "Papel & Config" },
];

export default function ProjectNavDock() {
  const { id } = useParams();

  return (
    <div className="project-nav-dock">
      <NavLink to="/projetos" className="project-nav-dock-back" aria-label="Voltar para Meus Projetos">
        ←
      </NavLink>
      <div className="project-nav-dock-divider" />
      <nav className="nav nav-pills">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={`/projetos/${id}/${item.to}`}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
