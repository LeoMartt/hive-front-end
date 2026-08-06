import { Navigate, Route, Routes } from "react-router";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectDetailPage from "../pages/ProjectDetailPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projetos" replace />} />
      <Route path="/projetos" element={<ProjectsPage />} />
      <Route path="/projetos/:id" element={<ProjectDetailPage />} />
    </Routes>
  );
}
