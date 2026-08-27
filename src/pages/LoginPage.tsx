import { useState } from "react";
import { Navigate } from "react-router";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "../config/authConfig";
import logoHive from "../assets/logo_hive.png";

function HiveLogo() {
  return <img className="auth-logo" src={logoHive} alt="HIVE" />;
}

export default function LoginPage() {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [error, setError] = useState<string | null>(null);

  // Já autenticado (ex.: voltou pra /login por engano) → manda pro app
  if (isAuthenticated) {
    return <Navigate to="/projetos" replace />;
  }

  const isBusy = inProgress !== InteractionStatus.None;

  const handleLogin = () => {
    setError(null);
    instance.loginRedirect(loginRequest).catch(() => {
      setError("Não foi possível iniciar o login. Tente novamente.");
    });
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <HiveLogo />
        <div className="auth-title">Entrar no HIVE</div>
        <div className="auth-sub">
          Acesso restrito a contas institucionais da FUMEP/EEP
        </div>

        <button
          type="button"
          className="btn btn-primary auth-btn"
          onClick={handleLogin}
          disabled={isBusy}
        >
          {isBusy ? "Redirecionando…" : "Entrar com conta corporativa"}
        </button>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-footer">
          Homologation and Integrated Validation Environment
        </div>
      </div>
    </div>
  );
}