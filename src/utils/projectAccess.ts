import type { TeamMember } from "../types/project";
import type { Activity } from "../types/activity";
import { DEFAULT_PERMISSION_MATRIX, type ProjectAction, type ProjectPermissionMatrix, type ProjectPermissionRole } from "../types/projectPermissions";

const ROLE_CODES = { "Gestor de Projetos": "GESTOR", Tester: "TESTER", Desenvolvedor: "DEV" } as const;

export function projectAllows(memberships: TeamMember[], action: ProjectAction, matrix: ProjectPermissionMatrix = {}): boolean {
  return memberships.some(member => {
    const role = ROLE_CODES[member.role];
    return role === "GESTOR" || (matrix[action]?.[role] ?? DEFAULT_PERMISSION_MATRIX[action]?.[role] ?? false);
  });
}

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

export function membershipsAllowIssueCreation(memberships: TeamMember[], matrix: ProjectPermissionMatrix = {}): boolean {
  return projectAllows(memberships, "issues_create", matrix);
}

export function membershipsAllowProjectManagement(memberships: TeamMember[]): boolean {
  return memberships.some((member) => member.role === "Gestor de Projetos");
}

export function membershipsAllowAssignedIssues(memberships: TeamMember[], matrix: ProjectPermissionMatrix = {}): boolean {
  return projectAllows(memberships, "issues_analyze", matrix);
}

export function canConcludeActivity(memberships: TeamMember[], activity: Activity, currentUser: CurrentUserAccess, matrix: ProjectPermissionMatrix = {}, action: ProjectAction = "activities_complete"): boolean {
  if (memberships.some((member) => member.role === "Gestor de Projetos")) return true;
  return memberships.some(member => {
    if (!projectAllows([member], action, matrix)) return false;
    const role: ProjectPermissionRole = ROLE_CODES[member.role];
    const assignedId = role === "TESTER" ? activity.testerId : activity.developerId;
    const assignedName = role === "TESTER" ? activity.tester : activity.dev;
    if (assignedId) return [currentUser.id, currentUser.email, member.id, member.email].some(id => Boolean(id) && id?.toLowerCase() === assignedId.toLowerCase());
    return namesMatch(assignedName, member.name);
  });
}
