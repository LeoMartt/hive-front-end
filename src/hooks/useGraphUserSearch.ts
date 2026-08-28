import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import type { AccountInfo } from "@azure/msal-browser";
import { graphUserSearchRequest } from "../config/authConfig";

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

interface UseGraphUserSearchResult {
  userSearch: string;
  searchResults: GraphUser[];
  searchLoading: boolean;
  selectedUser: GraphUser | null;
  handleSearchChange: (query: string) => Promise<void>;
  handleSelectUser: (user: GraphUser) => void;
  reset: () => void;
}

// Extraído de NewProjectModal — a parte com mais risco real (chamada assíncrona, token
// MSAL, InteractionRequiredAuthError) desse fluxo, agora compartilhada com InviteUserModal
// em vez de duplicada. Cada consumidor mantém sua própria UI de dropdown/papel/lista.
export function useGraphUserSearch(): UseGraphUserSearchResult {
  const { instance, accounts } = useMsal();
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GraphUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GraphUser | null>(null);

  async function handleSearchChange(query: string) {
    setUserSearch(query);
    setSelectedUser(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const account = accounts[0] as AccountInfo;
      const tokenResponse = await instance.acquireTokenSilent({
        ...graphUserSearchRequest,
        account,
      });

      // Remove aspas do input (quebrariam o valor entre aspas do $search) e
      // encoda o valor inteiro — evita OData injection e erro de request.
      const term = query.replace(/"/g, "").trim();
      const searchValue = encodeURIComponent(`"displayName:${term}"`);
      const url = `https://graph.microsoft.com/v1.0/users?$search=${searchValue}&$select=id,displayName,mail,userPrincipalName&$top=8`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          ConsistencyLevel: "eventual",
        },
      });

      if (!response.ok) throw new Error(`Graph API retornou ${response.status}`);

      const data = await response.json();
      setSearchResults(data.value ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === "InteractionRequiredAuthError") {
        instance.acquireTokenRedirect(graphUserSearchRequest);
        return;
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSelectUser(user: GraphUser) {
    setSelectedUser(user);
    setUserSearch(`${user.displayName} — ${user.mail ?? user.userPrincipalName}`);
    setSearchResults([]);
  }

  function reset() {
    setUserSearch("");
    setSearchResults([]);
    setSearchLoading(false);
    setSelectedUser(null);
  }

  return { userSearch, searchResults, searchLoading, selectedUser, handleSearchChange, handleSelectUser, reset };
}
