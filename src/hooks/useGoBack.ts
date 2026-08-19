import { useLocation, useNavigate } from "react-router";

// location.key é "default" apenas na entrada de histórico inicial de uma sessão de
// navegador (acesso direto por URL/link externo/reload) — nesse caso não há para onde
// voltar dentro da SPA, então cai no fallback. Em qualquer outro caso, volta para a
// página real de onde o usuário veio (navigate(-1)), o que naturalmente diferencia
// "veio da tabela de Issues" de "veio do painel de issues vinculadas de uma Atividade"
// sem precisar rastrear a origem explicitamente.
export function useGoBack(fallbackPath: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return function goBack() {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}
