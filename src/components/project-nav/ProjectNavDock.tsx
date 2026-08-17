import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import { useMsal } from "@azure/msal-react";
import Dropdown from "../common/Dropdown";
import FooterWidgetContent from "../common/FooterWidgetContent";
import NavIcon from "../common/NavIcon";
import { useProjects } from "../../hooks/useProjects";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const WORKSPACE_ITEMS = [
  {
    to: "dashboard",
    label: "Dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  },
  {
    to: "atividades",
    label: "Atividades",
    icon: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
  },
  {
    to: "estrutura",
    label: "Estrutura",
    icon: (
      <>
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <rect x="3" y="17" width="6" height="4" rx="1" />
        <rect x="15" y="17" width="6" height="4" rx="1" />
        <path d="M12 7v4M12 11H6v6M12 11h6v6" />
      </>
    ),
  },
  {
    to: "issues",
    label: "Issues",
    icon: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
      </>
    ),
  },
];

const CONFIG_ICON = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.71.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 04.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.71.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.96Z" />
  </>
);

const BACK_ICON = (
  <>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </>
);

const LOGOUT_ICON = (
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>
);

const SCROLL_THRESHOLD = 8;

export default function ProjectNavDock() {
  const { id } = useParams();
  const { projects } = useProjects();
  const { instance } = useMsal();
  const { name: currentUserName, role: currentUserRole } = useCurrentUser();
  const currentProject = projects.find((project) => project.id === id);
  const projectLabel = currentProject?.name ?? id ?? "";
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  function closePanel() {
    setOpen(false);
  }

  function handleLogout() {
    instance.logoutRedirect();
  }

  // Esconde o dock ao rolar para baixo, revela ao rolar para cima (ou perto do topo).
  // A referência "lastY" só é atualizada quando o limiar é cruzado (ou perto do topo) —
  // não a cada evento — senão uma rolagem suave (trackpad, muitos eventos de poucos
  // pixels) nunca acumula os 8px necessários entre dois eventos consecutivos e o dock
  // nunca esconde.
  useEffect(() => {
    let lastY = window.scrollY;
    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY <= 40) {
        setHidden(false);
        lastY = currentY;
        return;
      }
      const delta = currentY - lastY;
      if (delta > SCROLL_THRESHOLD) {
        setHidden(true);
        setOpen(false);
        lastY = currentY;
      } else if (delta < -SCROLL_THRESHOLD) {
        setHidden(false);
        lastY = currentY;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Escurece o resto da página enquanto o painel está aberto — sem isso, o conteúdo
          por trás "vaza" pelas laterais do painel (que não cobre a largura toda). */}
      <div className={`nav-dock-backdrop${open ? " open" : ""}`} />
      <Dropdown
        className={`nav-dock${hidden ? " hidden" : ""}`}
        menuClassName="nav-dock-panel"
        keepMounted
        open={open}
        onOpenChange={setOpen}
        closeOnMenuClick={false}
        toggle={({ toggle }) => (
          <button type="button" id="nav-dock-toggle" className="footer-widget nav-dock-toggle" onClick={toggle}>
            <FooterWidgetContent userName={currentUserName} userRole={currentUserRole} />
          </button>
        )}
      >
        <div className="nav-dock-group-label">Workspace</div>
        <nav className="nav-dock-items">
          {WORKSPACE_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={`/projetos/${id}/${item.to}`}
              className={({ isActive }) => `nav-dock-item${isActive ? " active" : ""}`}
              onClick={closePanel}
            >
              <NavIcon>{item.icon}</NavIcon>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-dock-group-label">Administração</div>
        <nav className="nav-dock-items">
          <NavLink
            to={`/projetos/${id}/config`}
            className={({ isActive }) => `nav-dock-item${isActive ? " active" : ""}`}
            onClick={closePanel}
          >
            <NavIcon>{CONFIG_ICON}</NavIcon>
            Papéis &amp; Config
          </NavLink>
          <NavLink
            to="/projetos"
            end
            className={({ isActive }) => `nav-dock-item${isActive ? " active" : ""}`}
            onClick={closePanel}
          >
            <NavIcon>{BACK_ICON}</NavIcon>
            Meus Projetos
          </NavLink>
          <button type="button" className="nav-dock-item nav-dock-item-danger" onClick={handleLogout}>
            <NavIcon>{LOGOUT_ICON}</NavIcon>
            Sair
          </button>
        </nav>

        <div className="nav-dock-footer">
          <div className="nav-dock-project-pill">
            <div className="nav-dock-project-pill-label">Projeto ativo</div>
            <div className="nav-dock-project-pill-value">
              <span className="nav-dock-project-dot" />
              {projectLabel}
            </div>
          </div>
        </div>
      </Dropdown>
    </>
  );
}