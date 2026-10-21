import { Outlet, useParams } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";
import { ProjectConfigProvider } from "../context/ProjectConfigProvider";

export default function ProjectLayout() {
  const { id } = useParams();
  return (
    <ProjectConfigProvider key={id}>
      <div>
        <ProjectNavDock />
        <main className="project-layout-content">
          <Outlet />
        </main>
      </div>
    </ProjectConfigProvider>
  );
}
