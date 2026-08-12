import { Outlet } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";

export default function ProjectLayout() {
  return (
    <div>
      <ProjectNavDock />
      <main className="container py-4 project-layout-content">
        <Outlet />
      </main>
    </div>
  );
}
