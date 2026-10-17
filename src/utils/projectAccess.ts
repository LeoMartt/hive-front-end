import type { TeamMember } from "../types/project";
import type { Activity } from "../types/activity";

export interface CurrentUserAccess {
  id?: string;
  email?: string;
  name: string;
}

function normalizeLookupValue(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function namesMatch(personName: string | undefined, currentUserName: string | undefined): boolean {
  const person = normalizeLookupValue(personName);
  const current = normalizeLookupValue(currentUserName);
  if (!person || !current) return false;
  if (person === current) return true;

  const personTokens = person.split(/\s+/).filter((token) => token.length > 1);
  const currentTokens = current.split(/\s+/).filter((token) => token.length > 1);

  return (
    (currentTokens.length > 0 && currentTokens.every((token) => person.includes(token))) ||
    (personTokens.length > 0 && personTokens.every((token) => current.includes(token)))
  );
}

export function getCurrentUserMemberships(team: TeamMember[], currentUser: CurrentUserAccess): TeamMember[] {
  const normalizedCurrentId = currentUser.id?.toLowerCase();
  const normalizedCurrentEmail = currentUser.email?.toLowerCase();
  const currentUserHasStrongIdentity = normalizedCurrentId !== undefined || normalizedCurrentEmail !== undefined;

  return team.filter((member) => {
    const normalizedMemberId = member.id?.toLowerCase();
    const normalizedMemberEmail = member.email?.toLowerCase();

    if (normalizedCurrentId !== undefined && normalizedMemberId === normalizedCurrentId) return true;
    if (
      normalizedCurrentEmail !== undefined &&
      (normalizedMemberEmail === normalizedCurrentEmail || normalizedMemberId === normalizedCurrentEmail)
    ) {
      return true;
    }

    if (currentUserHasStrongIdentity) return false;

    return namesMatch(member.name, currentUser.name);
  });
}

export function membershipsAllowIssueCreation(memberships: TeamMember[]): boolean {
  return memberships.some((member) => member.role === "Gestor de Projetos" || member.role === "Tester");
}

export function membershipsAllowProjectManagement(memberships: TeamMember[]): boolean {
  return memberships.some((member) => member.role === "Gestor de Projetos");
}

export function membershipsAllowAssignedIssues(memberships: TeamMember[]): boolean {
  return memberships.some((member) => member.role === "Gestor de Projetos" || member.role === "Desenvolvedor");
}

export function canConcludeActivity(memberships: TeamMember[], activity: Activity, currentUser: CurrentUserAccess): boolean {
  if (memberships.some((member) => member.role === "Gestor de Projetos")) return true;
  const testerMemberships = memberships.filter((member) => member.role === "Tester");
  if (testerMemberships.length === 0) return false;
  if (activity.testerId) {
    const identities = [currentUser.id, currentUser.email, ...testerMemberships.flatMap((member) => [member.id, member.email])];
    return identities.some((id) => Boolean(id) && id?.toLowerCase() === activity.testerId?.toLowerCase());
  }
  return testerMemberships.some((member) => namesMatch(activity.tester, member.name));
}
