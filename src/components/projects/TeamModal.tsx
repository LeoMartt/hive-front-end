import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import type { TeamMember } from "../../types/project";

interface TeamModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
}

export default function TeamModal({ show, onHide, team }: TeamModalProps) {
  return (
    <Modal open={show} onClose={onHide} labelledBy="team-modal-title">
      <div className="modal-title" id="team-modal-title">
        Equipe do projeto
      </div>
      <div>
        {team.map((member) => (
          <div className="team-member-row" key={member.initials + member.role}>
            <Avatar
              name={member.name}
              personKey={member.id ?? member.email}
              className="team-member-av"
              alt=""
            />
            <div className="team-member-info">
              <b>{member.name}</b>
              <span>{member.role}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
