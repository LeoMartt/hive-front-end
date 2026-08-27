import { useState } from "react";
import Modal from "../common/Modal";
import { useGraphUserSearch } from "../../hooks/useGraphUserSearch";
import { getInitials } from "../../utils/initials";
import Avatar from "../common/Avatar";
import type { TeamMember, UserRole } from "../../types/project";

interface InviteUserModalProps {
  show: boolean;
  onHide: () => void;
  currentTeam: TeamMember[];
  onInvite: (member: TeamMember) => void;
}

const ROLE_OPTIONS: UserRole[] = ["Gestor de Projetos", "Tester", "Desenvolvedor"];

export default function InviteUserModal({ show, onHide, currentTeam, onInvite }: InviteUserModalProps) {
  const search = useGraphUserSearch();
  const [selectedRole, setSelectedRole] = useState<UserRole>(ROLE_OPTIONS[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function resetAndHide() {
    search.reset();
    setSelectedRole(ROLE_OPTIONS[0]);
    setErrorMsg(null);
    onHide();
  }

  function handleAdd() {
    const { selectedUser } = search;
    if (!selectedUser) return;

    // Comparação por name, não id — membros vindos do seed de useProjects.ts não têm id,
    // então comparar por id deixaria passar um convite duplicado do Graph para alguém
    // que já está no time via seed.
    const alreadyAdded = currentTeam.some(
      (member) => member.name === selectedUser.displayName && member.role === selectedRole
    );
    if (alreadyAdded) {
      setErrorMsg(`${selectedUser.displayName} já está no projeto com o papel de ${selectedRole}.`);
      return;
    }

    const member: TeamMember = {
      id: selectedUser.id,
      initials: getInitials(selectedUser.displayName),
      name: selectedUser.displayName,
      email: selectedUser.mail ?? selectedUser.userPrincipalName,
      role: selectedRole,
    };

    onInvite(member);
    resetAndHide();
  }

  const showUserDropdown = search.userSearch.trim().length >= 2 && !search.selectedUser;

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="invite-user-modal-title">
      <div className="modal-title" id="invite-user-modal-title">
        Convidar usuário
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="cfgUserSearchInput">
          Usuário
        </label>
        <div className="user-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="form-input"
            type="text"
            id="cfgUserSearchInput"
            aria-label="Pesquisar usuário"
            placeholder="Pesquisar usuário no tenant FUMEP…"
            autoComplete="off"
            value={search.userSearch}
            onChange={(event) => search.handleSearchChange(event.target.value)}
          />
          {showUserDropdown && (
            <div className="user-dropdown">
              {search.searchLoading && <div className="user-dropdown-loading">Buscando…</div>}
              {!search.searchLoading && search.searchResults.length === 0 && (
                <div className="user-dropdown-empty">Nenhum usuário encontrado.</div>
              )}
              {!search.searchLoading &&
                search.searchResults.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    className="user-dropdown-item"
                    onClick={() => search.handleSelectUser(user)}
                  >
                    <Avatar
                      name={user.displayName}
                      personKey={user.id}
                      className="team-member-av"
                      alt=""
                    />
                    <span className="user-dropdown-item-text">
                      <span className="user-dropdown-item-name">{user.displayName}</span>
                      <span className="user-dropdown-item-email">{user.mail ?? user.userPrincipalName}</span>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cfgUserRoleSelect">
          Papel
        </label>
        <select
          className="form-input"
          id="cfgUserRoleSelect"
          aria-label="Papel do usuário"
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value as UserRole)}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={!search.selectedUser} onClick={handleAdd}>
          Convidar
        </button>
      </div>
    </Modal>
  );
}
