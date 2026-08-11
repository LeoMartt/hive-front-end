import type { TeamMember } from "../../types/project";

interface TeamAvatarsProps {
  team: TeamMember[];
  onOpenTeam: () => void;
}

const MAX_VISIBLE = 3;

export default function TeamAvatars({ team, onOpenTeam }: TeamAvatarsProps) {
  const visible = team.slice(0, MAX_VISIBLE);
  const remaining = team.length - visible.length;

  return (
    <div
      className="avatar-stack"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onOpenTeam();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onOpenTeam();
        }
      }}
    >
      {visible.map((member) => (
        <div className="avatar-circle" key={member.initials + member.role}>
          {member.initials}
        </div>
      ))}
      {remaining > 0 && <div className="avatar-circle text-body-secondary">+{remaining}</div>}
    </div>
  );
}
