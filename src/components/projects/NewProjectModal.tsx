import { useState } from "react";
import Modal from "../common/Modal";
import CloseIcon from "../common/CloseIcon";
import { getInitials } from "../../utils/initials";
import Avatar from "../common/Avatar";
import { useGraphUserSearch } from "../../hooks/useGraphUserSearch";
import type { NewProjectInput, ProjectMode, TeamMember, UserRole } from "../../types/project";

interface NewProjectModalProps {
  show: boolean;
  onHide: () => void;
  onCreate: (input: NewProjectInput) => void;
}

const ROLE_OPTIONS: UserRole[] = ["Gestor de Projetos", "Tester", "Desenvolvedor"];

const LEVEL_DEFAULTS: Record<ProjectMode, string[]> = {
  uat: ["Área", "Cenário"],
  cutover: ["Módulo"],
};

interface NewProjectFormState {
  name: string;
  description: string;
  mode: ProjectMode;
  levelNames: string[];
  members: TeamMember[];
  selectedRole: UserRole;
  errorMsg: string | null;
}

function createEmptyState(): NewProjectFormState {
  return {
    name: "",
    description: "",
    mode: "uat",
    levelNames: LEVEL_DEFAULTS.uat,
    members: [],
    selectedRole: ROLE_OPTIONS[0],
    errorMsg: null,
  };
}

export default function NewProjectModal({ show, onHide, onCreate }: NewProjectModalProps) {
  const [state, setState] = useState<NewProjectFormState>(createEmptyState);
  const search = useGraphUserSearch();

  function resetAndHide() {
    setState(createEmptyState());
    search.reset();
    onHide();
  }

  function handleModeChange(mode: ProjectMode) {
    setState((prev) => ({ ...prev, mode, levelNames: LEVEL_DEFAULTS[mode] }));
  }

  function handleLevelNameChange(index: number, value: string) {
    setState((prev) => {
      const levelNames = [...prev.levelNames];
      levelNames[index] = value;
      return { ...prev, levelNames };
    });
  }

  function handleAddUser() {
    const { selectedUser } = search;
    const { selectedRole, members } = state;
    if (!selectedUser) return;

    const alreadyAdded = members.some(
      (member) => member.id === selectedUser.id && member.role === selectedRole
    );
    if (alreadyAdded) {
      setState((prev) => ({
        ...prev,
        errorMsg: `${selectedUser.displayName} já está no projeto com o papel de ${selectedRole}.`,
      }));
      return;
    }

    const newMember: TeamMember = {
      id: selectedUser.id,
      initials: getInitials(selectedUser.displayName),
      name: selectedUser.displayName,
      email: selectedUser.mail ?? selectedUser.userPrincipalName,
      role: selectedRole,
    };

    setState((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      errorMsg: null,
    }));
    search.reset();
  }

  function handleRemoveUser(index: number) {
    setState((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  }

  function handleConfirm() {
    onCreate({
      name: state.name,
      description: state.description,
      mode: state.mode,
      hierarchyLevels: state.levelNames.map((level, index) => level.trim() || `Nível ${index + 1}`),
      team: state.members,
    });
    resetAndHide();
  }

  const canConfirm = state.name.trim().length > 0;
  const showUserDropdown = search.userSearch.trim().length >= 2 && !search.selectedUser;

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="new-project-modal-title">
      <div className="modal-title" id="new-project-modal-title">
        Novo projeto
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="npName">
          Nome do projeto
        </label>
        <input
          className="form-input"
          id="npName"
          type="text"
          placeholder="Ex.: CRM Homologação Comercial"
          value={state.name}
          onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="npDescription">
          Descrição <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="npDescription"
          rows={2}
          placeholder="Contexto do projeto, escopo, sistemas envolvidos…"
          value={state.description}
          onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>

      <div className="form-group">
        <span className="form-label">Modo</span>
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-opt${state.mode === "uat" ? " sel uat" : ""}`}
            aria-pressed={state.mode === "uat"}
            onClick={() => handleModeChange("uat")}
          >
            UAT
          </button>
          <button
            type="button"
            className={`mode-opt${state.mode === "cutover" ? " sel cutover" : ""}`}
            aria-pressed={state.mode === "cutover"}
            onClick={() => handleModeChange("cutover")}
          >
            Cutover
          </button>
        </div>
        <div className="form-hint">O modo não pode ser alterado após a criação do projeto.</div>
      </div>

      <div className="form-group">
        <span className="form-label" id="npLevelsLabel">
          Nomes dos níveis hierárquicos
        </span>
        {state.levelNames.map((levelName, index) => (
          <div className="level-row" key={index}>
            <span className="level-badge">{index + 1}</span>
            <input
              className="form-input"
              type="text"
              id={`npLevel-${index}`}
              aria-label={`Nível ${index + 1}`}
              value={levelName}
              onChange={(event) => handleLevelNameChange(index, event.target.value)}
            />
          </div>
        ))}
        <div className="level-row">
          <span className="level-badge">{state.levelNames.length + 1}</span>
          <span className="mono">Atividade (fixo)</span>
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">Usuários do projeto</span>

        {state.errorMsg && <div className="error-banner">{state.errorMsg}</div>}

        <div className="user-add-row">
          <div className="user-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="form-input"
              type="text"
              id="npUserSearchInput"
              aria-label="Pesquisar usuário"
              placeholder="Pesquisar usuário no tenant FUMEP…"
              autoComplete="off"
              value={search.userSearch}
              onChange={(event) => search.handleSearchChange(event.target.value)}
            />
            {showUserDropdown && (
              <div className="user-dropdown">
                {search.searchLoading && (
                  <div className="user-dropdown-loading">Buscando…</div>
                )}
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
                        <span className="user-dropdown-item-email">
                          {user.mail ?? user.userPrincipalName}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <select
            className="form-input role-select"
            id="npUserRole"
            aria-label="Papel do usuário"
            value={state.selectedRole}
            onChange={(event) => setState((prev) => ({ ...prev, selectedRole: event.target.value as UserRole }))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-add-user"
            disabled={!search.selectedUser}
            aria-label="Adicionar usuário"
            onClick={handleAddUser}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="user-list">
          {state.members.length === 0 ? (
            <div className="user-list-empty">Nenhum usuário adicionado ainda.</div>
          ) : (
            state.members.map((member, index) => (
              <div className="user-list-row" key={`${member.id ?? member.initials}-${member.role}`}>
                <span className="team-member-av">{member.initials}</span>
                <div className="team-member-info">
                  <b>{member.name}</b>
                  <span>{member.email ?? member.role}</span>
                  {member.email && <span className="team-member-role">{member.role}</span>}
                </div>
                <button
                  type="button"
                  className="btn-remove-user"
                  aria-label={`Remover ${member.name}`}
                  onClick={() => handleRemoveUser(index)}
                >
                  <CloseIcon />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="form-hint">
          Um usuário pode ter mais de um papel: adicione-o novamente com outro papel, se necessário.
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
          Criar projeto
        </button>
      </div>
    </Modal>
  );
}
