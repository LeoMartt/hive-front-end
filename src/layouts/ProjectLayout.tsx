import { Outlet } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";
import { ProjectConfigProvider } from "../context/ProjectConfigContext";

export default function ProjectLayout() {
  return (
    <ProjectConfigProvider>
      <div>
        <ProjectNavDock />
        <main className="project-layout-content">
          <Outlet />
        </main>
      </div>
    </ProjectConfigProvider>
  );
}
