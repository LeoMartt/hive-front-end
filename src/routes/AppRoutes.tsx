import { Navigate, Route, Routes } from "react-router";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectLayout from "../layouts/ProjectLayout";
import ProjectActivitiesPage from "../pages/ProjectActivitiesPage";
import ActivityDetailPlaceholderPage from "../pages/ActivityDetailPlaceholderPage";
import PlaceholderPage from "../pages/PlaceholderPage";
import ProjectDashboardPage from "../pages/ProjectDashboardPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projetos" replace />} />
      <Route path="/projetos" element={<ProjectsPage />} />
      <Route path="/projetos/:id" element={<ProjectLayout />}>
        <Route index element={<Navigate to="atividades" replace />} />
        <Route path="dashboard" element={<ProjectDashboardPage />} />
        <Route path="atividades" element={<ProjectActivitiesPage />} />
        <Route path="atividades/:activityId" element={<ActivityDetailPlaceholderPage />} />
        <Route path="estrutura" element={<PlaceholderPage title="A estrutura (WBS) do projeto" />} />
        <Route path="issues" element={<PlaceholderPage title="As issues do projeto" />} />
        <Route path="config" element={<PlaceholderPage title="A configuração do projeto" />} />
      </Route>
    </Routes>
  );
}
