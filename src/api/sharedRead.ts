import { msalInstance } from "../config/msalInstance";

const pending = new Map<string, Promise<unknown>>();

// Share concurrent reads only. Completed reads are never reused as permission caches.
export function sharedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  const scopedKey = `${account?.homeAccountId ?? "anonymous"}:${key}`;
  const existing = pending.get(scopedKey);
  if (existing) return existing as Promise<T>;
  const request = load().finally(() => {
    if (pending.get(scopedKey) === request) pending.delete(scopedKey);
  });
  pending.set(scopedKey, request);
  return request;
}

export function invalidateSharedReads() {
  pending.clear();
}
