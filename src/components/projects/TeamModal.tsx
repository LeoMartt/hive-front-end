import Modal from "react-bootstrap/Modal";
import type { TeamMember } from "../../types/project";

interface TeamModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
}

export default function TeamModal({ show, onHide, team }: TeamModalProps) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6">Equipe do projeto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul className="list-unstyled mb-0">
          {team.map((member) => (
            <li
              key={member.initials + member.role}
              className="d-flex align-items-center gap-2 py-2 border-bottom"
            >
              <div className="avatar-circle">{member.initials}</div>
              <div>
                <div className="fw-semibold">{member.name}</div>
                <div className="text-body-secondary small">{member.role}</div>
              </div>
            </li>
          ))}
        </ul>
      </Modal.Body>
    </Modal>
  );
}
