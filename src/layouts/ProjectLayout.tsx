import { Outlet } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";

export default function ProjectLayout() {
  return (
    <div>
      <ProjectNavDock />
      <main className="project-layout-content">
        <Outlet />
      </main>
    </div>
  );
}
