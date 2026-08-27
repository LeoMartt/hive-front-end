import { useMsal } from "@azure/msal-react";
import { shortName } from "../utils/shortName";

interface CurrentUser {
  name: string;
  role: string;
}

export function useCurrentUser(): CurrentUser {
  const { accounts } = useMsal();
  const account = accounts[0];

  return {
    name: account?.name ? shortName(account.name) : "Usuário",
    // Papéis por usuário ainda não vêm do backend (RN45 / mapeamento pendente).
    // Mantido fixo como Gestor por enquanto, igual ao resto do protótipo (ver
    // comentário "role-gate removido temporariamente" no HTML de referência).
    role: "Gestor de Projetos",
  };
}