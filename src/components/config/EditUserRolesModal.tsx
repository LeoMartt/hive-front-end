import { useState } from "react";
import Modal from "../common/Modal";
import type { UserRole } from "../../types/project";
import type { GroupedTeamMember } from "../../utils/teamMembers";

interface EditUserRolesModalProps {
  show: boolean;
  onHide: () => void;
  member: GroupedTeamMember;
  onSave: (roles: UserRole[]) => void;
}

const ROLE_OPTIONS: UserRole[] = ["Gestor de Projetos", "Tester", "Desenvolvedor"];

export default function EditUserRolesModal({ show, onHide, member, onSave }: EditUserRolesModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(member.roles);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleRole(role: UserRole) {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
    setErrorMsg(null);
  }

  function handleSave() {
    if (selectedRoles.length === 0) {
      setErrorMsg("Selecione ao menos um papel.");
      return;
    }
    onSave(selectedRoles);
    onHide();
  }

  return (
    <Modal open={show} onClose={onHide} labelledBy="edit-user-roles-modal-title">
      <div className="modal-title" id="edit-user-roles-modal-title">
        Editar papéis <span className="modal-title-sub">{member.name}</span>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <span className="form-label">Papéis *</span>
        <div className="role-checkbox-row">
          {ROLE_OPTIONS.map((role) => (
            <label key={role} className="role-checkbox">
              <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />
              {role}
            </label>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}
