import { Navigate, Route, Routes } from "react-router";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectLayout from "../layouts/ProjectLayout";
import ProjectActivitiesPage from "../pages/ProjectActivitiesPage";
import ActivityDetailPage from "../pages/ActivityDetailPage";
import ProjectIssuesPage from "../pages/ProjectIssuesPage";
import IssueDetailPage from "../pages/IssueDetailPage";
import PlaceholderPage from "../pages/PlaceholderPage";
import ProjectDashboardPage from "../pages/ProjectDashboardPage";
import ProjectConfigPage from "../pages/ProjectConfigPage";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/projetos" replace />} />
        <Route path="/projetos" element={<ProjectsPage />} />
        <Route path="/projetos/:id" element={<ProjectLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ProjectDashboardPage />} />
          <Route path="atividades" element={<ProjectActivitiesPage />} />
          <Route path="atividades/:activityId" element={<ActivityDetailPage />} />
          <Route path="estrutura" element={<PlaceholderPage title="A estrutura (WBS) do projeto" />} />
          <Route path="issues" element={<ProjectIssuesPage />} />
          <Route path="issues/:issueId" element={<IssueDetailPage />} />
          <Route path="config" element={<ProjectConfigPage />} />
        </Route>
      </Route>
    </Routes>
  );
}