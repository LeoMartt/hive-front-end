import { Outlet, useLocation, useParams } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";
import { ProjectConfigProvider } from "../context/ProjectConfigProvider";
import { useProjectConfig } from "../context/ProjectConfigContext";

function ProjectContent() {
  const { can, ready } = useProjectConfig();
  const { pathname } = useLocation();
  const action = pathname.includes("/dashboard") ? "dashboard_view" : /\/(atividades|issues)(\/|$)/.test(pathname) ? "data_view" : null;
  if (ready && action && !can(action)) return <div className="error-banner" role="alert">Seu papel não possui permissão para acessar esta página neste projeto.</div>;
  return <Outlet />;
}

export default function ProjectLayout() {
  const { id } = useParams();
  return (
    <ProjectConfigProvider key={id}>
      <div>
        <ProjectNavDock />
        <main className="project-layout-content">
          <ProjectContent />
        </main>
      </div>
    </ProjectConfigProvider>
  );
}
