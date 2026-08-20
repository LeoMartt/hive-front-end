import { useState } from "react";
import { useProjects } from "../../hooks/useProjects";
import { groupTeamMembersByName, type GroupedTeamMember } from "../../utils/teamMembers";
import InviteUserModal from "./InviteUserModal";
import EditUserRolesModal from "./EditUserRolesModal";
import type { UserRole } from "../../types/project";

interface ConfigUsersTableProps {
  projectId: string;
}

// Mesma convenção de cor do mockup: Gestor usa a cor "execução" (azul), Tester e Dev
// usam a cor "liberado" (verde) — só Gestor se diferencia visualmente.
const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  "Gestor de Projetos": "activity-badge-execucao",
  Tester: "activity-badge-liberado",
  Desenvolvedor: "activity-badge-liberado",
};

export default function ConfigUsersTable({ projectId }: ConfigUsersTableProps) {
  const { projects, addTeamMember, replaceTeamMemberRoles } = useProjects();
  const project = projects.find((item) => item.id === projectId);
  const [showInvite, setShowInvite] = useState(false);
  const [editingMember, setEditingMember] = useState<GroupedTeamMember | null>(null);

  if (!project) return null;

  const groupedMembers = groupTeamMembersByName(project.team);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
          + Convidar usuário
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papéis</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupedMembers.map((member) => (
              <tr key={member.name}>
                <td>
                  <span className="avatar-mini">{member.initials}</span>
                  {member.name}
                </td>
                <td className="papeis-cell">
                  {member.roles.map((role) => (
                    <span key={role} className={`activity-badge ${ROLE_BADGE_CLASS[role]}`}>
                      <span className="activity-badge-dot" />
                      {role}
                    </span>
                  ))}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="attach-dl"
                    title="Editar papéis"
                    onClick={() => setEditingMember(member)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteUserModal
        show={showInvite}
        onHide={() => setShowInvite(false)}
        currentTeam={project.team}
        onInvite={(member) => addTeamMember(projectId, member)}
      />

      {editingMember && (
        <EditUserRolesModal
          show
          onHide={() => setEditingMember(null)}
          member={editingMember}
          onSave={(roles) => replaceTeamMemberRoles(projectId, editingMember.name, roles)}
        />
      )}
    </div>
  );
}
