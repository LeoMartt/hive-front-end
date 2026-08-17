import { useState } from "react";
import { Navigate } from "react-router";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "../config/authConfig";

function HiveLogo() {
  return (
    <svg className="auth-logo" viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="18" rx="8" ry="7" fill="#1F2024" />
      <rect x="8.2" y="14.4" width="15.6" height="2.4" fill="#FFE36E" />
      <rect x="8.6" y="19.6" width="14.8" height="2.4" fill="#FFE36E" />
      <ellipse cx="16" cy="18" rx="8" ry="7" fill="none" stroke="#1F2024" strokeWidth="1.2" />
      <path
        d="M9 11c1.5-3 4-4 7-4s5.5 1 7 4"
        stroke="#1F2024"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="16.5" r="1.1" fill="#1F2024" />
      <ellipse
        cx="8"
        cy="12"
        rx="3.4"
        ry="2.4"
        transform="rotate(-30 8 12)"
        fill="rgba(255,255,255,.55)"
        stroke="#1F2024"
        strokeWidth=".8"
      />
      <ellipse
        cx="24"
        cy="12"
        rx="3.4"
        ry="2.4"
        transform="rotate(30 24 12)"
        fill="rgba(255,255,255,.55)"
        stroke="#1F2024"
        strokeWidth=".8"
      />
    </svg>
  );
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