// Cache em memória (dura enquanto a aba estiver aberta) das fotos de perfil já
// resolvidas no Microsoft Graph.
//   - chave: "me" | id do Entra | e-mail/UPN, sempre normalizada (trim + lowercase)
//   - valor: blob URL da foto, ou null quando já tentamos e não há foto / a busca
//     falhou. Uma vez null, nunca mais buscamos aquela chave.
const cache = new Map<string, string | null>();

// Requisições em andamento, para deduplicar montagens simultâneas do mesmo avatar
// (ex.: a mesma pessoa repetida em várias linhas de uma tabela).
const inFlight = new Map<string, Promise<string | null>>();

export function normalizePhotoKey(key: string): string {
  return key.trim().toLowerCase();
}

// Leitura síncrona do cache. `undefined` = ainda não resolvido; `null` = resolvido
// sem foto; string = blob URL.
export function peekPhoto(key: string): string | null | undefined {
  return cache.get(key);
}

// Get-or-fetch com dedupe. `fetcher` só é chamado quando a chave ainda não foi
// resolvida nem está em voo. Qualquer rejeição do `fetcher` é engolida e cacheada
// como null (fallback silencioso: sem foto).
export function loadPhoto(
  key: string,
  fetcher: (key: string) => Promise<string | null>,
): Promise<string | null> {
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key) as string | null);
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetcher(key)
    .then((url) => {
      cache.set(key, url);
      return url;
    })
    .catch(() => {
      cache.set(key, null);
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
