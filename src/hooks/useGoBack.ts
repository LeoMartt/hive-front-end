import { useNavigate } from "react-router";

// history.state.idx só é incrementado por navigate() em modo "push" (o padrão) — um
// navigate() em modo "replace" mantém o mesmo idx. idx > 0 significa, portanto, que a
// sessão da SPA já empilhou pelo menos uma navegação real antes desta página, e é seguro
// voltar com navigate(-1). idx 0 (ou ausente) é a entrada inicial de uma sessão de
// navegador — acesso direto por URL/link externo/reload — sem histórico de push por
// trás, então cai no fallback. Isso diferencia "veio da tabela de Issues" de "veio do
// painel de issues vinculadas de uma Atividade" sem precisar rastrear a origem
// explicitamente, e não é enganado pelos redirects em "replace" já existentes no app
// (login, index de projeto) como `location.key !== "default"` seria.
export function useGoBack(fallbackPath: string): () => void {
  const navigate = useNavigate();

  return function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}
