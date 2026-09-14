import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { accountsApi } from "../api/resources/accounts";
import { useMocks } from "../config/env";
import { shortName } from "../utils/shortName";

interface CurrentUser {
  name: string;
  role: string;
  id?: string;
  email?: string;
  initials?: string;
}

export function useCurrentUser(): CurrentUser {
  const { accounts } = useMsal();
  const account = accounts[0];
  const [apiUser, setApiUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (useMocks) return;
    let cancelled = false;
    accountsApi
      .me()
      .then((user) => {
        if (cancelled) return;
        setApiUser({
          name: user.nome ? shortName(user.nome) : user.email,
          role: "Usuário",
          id: user.entra_object_id ?? user.id,
          email: user.email,
          initials: user.iniciais ?? undefined,
        });
      })
      .catch(() => {
        // Mantém o fallback do MSAL se o endpoint /me falhar durante a inicialização.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (apiUser) return apiUser;

  return {
    name: account?.name ? shortName(account.name) : "Usuário",
    role: useMocks ? "Gestor de Projetos" : "Usuário",
    id: account?.localAccountId,
    email: account?.username,
  };
}
