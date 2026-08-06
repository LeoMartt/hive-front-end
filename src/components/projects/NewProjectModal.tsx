import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import type { NewProjectInput, ProjectMode, TeamMember, UserRole } from "../../types/project";

interface NewProjectModalProps {
  show: boolean;
  onHide: () => void;
  onCreate: (input: NewProjectInput) => void;
}

interface MockUser {
  initials: string;
  name: string;
}

const MOCK_USERS: MockUser[] = [
  { initials: "GF", name: "Guilherme Fabretti" },
  { initials: "VC", name: "Vinícius Calefo Assarice" },
  { initials: "LM", name: "Leonardo Martins da Silva" },
  { initials: "RS", name: "Rafael Souza" },
  { initials: "RL", name: "R. Lima" },
  { initials: "JP", name: "J. Prado" },
  { initials: "CP", name: "C. Prado" },
  { initials: "MT", name: "M. Torres" },
];

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
  userSearch: string;
  selectedUser: MockUser | null;
  selectedRole: UserRole;
}

function createEmptyState(): NewProjectFormState {
  return {
    name: "",
    description: "",
    mode: "uat",
    levelNames: LEVEL_DEFAULTS.uat,
    members: [],
    userSearch: "",
    selectedUser: null,
    selectedRole: ROLE_OPTIONS[0],
  };
}

export default function NewProjectModal({ show, onHide, onCreate }: NewProjectModalProps) {
  const [state, setState] = useState<NewProjectFormState>(createEmptyState);

  function resetAndHide() {
    setState(createEmptyState());
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

  const filteredUsers = MOCK_USERS.filter((user) =>
    user.name.toLowerCase().includes(state.userSearch.trim().toLowerCase())
  );

  function handleSelectUser(user: MockUser) {
    setState((prev) => ({ ...prev, selectedUser: user, userSearch: user.name }));
  }

  function handleAddUser() {
    if (!state.selectedUser) return;
    const newMember: TeamMember = {
      initials: state.selectedUser.initials,
      name: state.selectedUser.name,
      role: state.selectedRole,
    };
    setState((prev) => {
      const alreadyAdded = prev.members.some(
        (member) => member.initials === newMember.initials && member.role === newMember.role
      );
      if (alreadyAdded) return prev;
      return {
        ...prev,
        members: [...prev.members, newMember],
        userSearch: "",
        selectedUser: null,
      };
    });
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

  return (
    <Modal show={show} onHide={resetAndHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title as="h6">Novo projeto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3" controlId="npName">
          <Form.Label>Nome do projeto</Form.Label>
          <Form.Control
            type="text"
            placeholder="Ex.: CRM Homologação Comercial"
            value={state.name}
            onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="npDescription">
          <Form.Label>
            Descrição <span className="text-body-secondary fw-normal">(opcional)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Contexto do projeto, escopo, sistemas envolvidos…"
            value={state.description}
            onChange={(event) =>
              setState((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="npMode">
          <Form.Label className="d-block">Modo</Form.Label>
          <div className="btn-group w-100" role="group">
            <Button
              type="button"
              variant={state.mode === "uat" ? "primary" : "outline-secondary"}
              aria-pressed={state.mode === "uat"}
              onClick={() => handleModeChange("uat")}
            >
              UAT
            </Button>
            <Button
              type="button"
              variant={state.mode === "cutover" ? "primary" : "outline-secondary"}
              aria-pressed={state.mode === "cutover"}
              onClick={() => handleModeChange("cutover")}
            >
              Cutover
            </Button>
          </div>
          <Form.Text>O modo não pode ser alterado após a criação do projeto.</Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label id="npLevelsLabel">Nomes dos níveis hierárquicos</Form.Label>
          {state.levelNames.map((levelName, index) => (
            <div className="d-flex align-items-center gap-2 mb-2" key={index}>
              <span className="text-body-secondary small level-index">{index + 1}</span>
              <Form.Control
                type="text"
                id={`npLevel-${index}`}
                aria-label={`Nível ${index + 1}`}
                value={levelName}
                onChange={(event) => handleLevelNameChange(index, event.target.value)}
              />
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 text-body-secondary small">
            <span className="level-index">{state.levelNames.length + 1}</span>
            <span>Atividade (fixo)</span>
          </div>
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>Usuários do projeto</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Form.Control
              type="text"
              id="npUserSearchInput"
              aria-label="Pesquisar usuário"
              placeholder="Pesquisar usuário…"
              value={state.userSearch}
              onChange={(event) =>
                setState((prev) => ({ ...prev, userSearch: event.target.value, selectedUser: null }))
              }
            />
            <Form.Select
              className="role-select"
              id="npUserRole"
              aria-label="Papel do usuário"
              value={state.selectedRole}
              onChange={(event) =>
                setState((prev) => ({ ...prev, selectedRole: event.target.value as UserRole }))
              }
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Form.Select>
            <Button
              type="button"
              variant="outline-secondary"
              disabled={!state.selectedUser}
              aria-label="Adicionar usuário"
              onClick={handleAddUser}
            >
              +
            </Button>
          </div>

          {state.userSearch && !state.selectedUser && (
            <div className="list-group mb-2">
              {filteredUsers.length === 0 && (
                <div className="list-group-item text-body-secondary small">
                  Nenhum usuário encontrado.
                </div>
              )}
              {filteredUsers.map((user) => (
                <button
                  type="button"
                  key={user.initials}
                  className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                  onClick={() => handleSelectUser(user)}
                >
                  <span className="avatar-circle">{user.initials}</span>
                  {user.name}
                </button>
              ))}
            </div>
          )}

          {state.members.length === 0 ? (
            <p className="text-body-secondary small mb-0">Nenhum usuário adicionado ainda.</p>
          ) : (
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {state.members.map((member, index) => (
                <li
                  key={member.initials + member.role}
                  className="d-flex align-items-center gap-2 border rounded p-2"
                >
                  <span className="avatar-circle">{member.initials}</span>
                  <span className="flex-grow-1">
                    <span className="fw-semibold">{member.name}</span>{" "}
                    <span className="text-body-secondary small">{member.role}</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    aria-label={`Remover ${member.name}`}
                    onClick={() => handleRemoveUser(index)}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Form.Text>
            Um usuário pode ter mais de um papel: adicione-o novamente com outro papel, se necessário.
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={resetAndHide}>
          Cancelar
        </Button>
        <Button variant="primary" type="button" disabled={!canConfirm} onClick={handleConfirm}>
          Criar projeto
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
