import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest, graphUserSearchRequest } from "../config/authConfig";
import { loadPhoto, normalizePhotoKey, peekPhoto } from "../utils/photoCache";

// Busca a foto de perfil (Microsoft 365 / Entra ID) de uma pessoa e devolve uma
// blob URL, ou null quando não há foto / não foi possível buscar.
//
// - key === "me" (ou igual ao id/e-mail do usuário logado) -> endpoint /me/photo
//   (escopo User.Read, já concedido no login).
// - qualquer outra key -> /users/{key}/photo (escopo User.ReadBasic.All; pode
//   falhar com 403 se faltar consentimento de admin no tenant -> fallback).
// - key === undefined -> não toca na rede, devolve null (dados mockados sem
//   identificador de pessoa).
//
// Qualquer erro (404 sem foto, 403 sem consent, token exige interação, rede) vira
// null silenciosamente, cacheado para não re-buscar.
export function usePersonPhoto(key: string | undefined): string | null {
  const { instance } = useMsal();
  const normalized = key ? normalizePhotoKey(key) : undefined;

  // Valor síncrono, derivado no render: sem key -> null; cache já resolvido ->
  // usa; ainda não resolvido -> null (mostra iniciais enquanto busca).
  const cached = normalized ? peekPhoto(normalized) ?? null : null;

  // Resultado da busca assíncrona, carimbado com a key a que pertence (evita
  // mostrar a foto errada se o mesmo Avatar for reaproveitado para outra pessoa).
  const [fetched, setFetched] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!normalized || peekPhoto(normalized) !== undefined) return;

    // Narrow para string (o guard acima garante) para uso dentro do closure.
    const target = normalized;
    let cancelled = false;

    async function fetchPhoto(): Promise<string | null> {
      const account = instance.getAllAccounts()[0];
      if (!account) return null;

      const isMe =
        target === "me" ||
        account.localAccountId.toLowerCase() === target ||
        (account.username?.toLowerCase() ?? "") === target;

      const request = isMe ? loginRequest : graphUserSearchRequest;
      const token = await instance.acquireTokenSilent({ ...request, account });

      const endpoint = isMe
        ? "https://graph.microsoft.com/v1.0/me/photo/$value"
        : `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
            target,
          )}/photo/$value`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!response.ok) return null;

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    loadPhoto(target, fetchPhoto).then((resolved) => {
      if (!cancelled) setFetched({ key: target, url: resolved });
    });

    return () => {
      cancelled = true;
    };
  }, [normalized, instance]);

  const asyncUrl = fetched && fetched.key === normalized ? fetched.url : null;
  return cached ?? asyncUrl;
}
