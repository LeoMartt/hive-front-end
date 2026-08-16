import { Navigate, Outlet } from "react-router";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

export default function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();

  // Enquanto o MSAL ainda está processando o retorno do redirect de login,
  // evita piscar a tela de login antes de confirmar se já está autenticado.
  if (inProgress !== InteractionStatus.None) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}