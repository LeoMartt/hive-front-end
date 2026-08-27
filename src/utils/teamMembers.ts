import type { TeamMember, UserRole } from "../types/project";

export interface GroupedTeamMember {
  name: string;
  initials: string;
  id?: string;
  email?: string;
  roles: UserRole[];
}

// TeamMember já modela "múltiplos papéis" como múltiplas entradas com o mesmo name
// (mesma convenção que NewProjectModal usa ao permitir "adicionar de novo com outro
// papel") — esta função agrupa essas entradas de volta numa linha por pessoa, pra exibir
// como múltiplos badges na mesma linha da tabela (mesmo visual do mockup).
export function groupTeamMembersByName(team: TeamMember[]): GroupedTeamMember[] {
  const groups = new Map<string, GroupedTeamMember>();

  for (const member of team) {
    const existing = groups.get(member.name);
    if (existing) {
      if (!existing.roles.includes(member.role)) {
        existing.roles.push(member.role);
      }
      continue;
    }
    groups.set(member.name, {
      name: member.name,
      initials: member.initials,
      id: member.id,
      email: member.email,
      roles: [member.role],
    });
  }

  return Array.from(groups.values());
}
