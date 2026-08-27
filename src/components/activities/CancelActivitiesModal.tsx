import Modal from "../common/Modal";

interface CancelActivitiesModalProps {
  show: boolean;
  count: number;
  onHide: () => void;
  onConfirm: () => void;
}

export default function CancelActivitiesModal({ show, count, onHide, onConfirm }: CancelActivitiesModalProps) {
  return (
    <Modal open={show} onClose={onHide} labelledBy="cancel-activities-modal-title">
      <div className="modal-title" id="cancel-activities-modal-title">
        Cancelar atividades
      </div>
      <div className="modal-subtitle">
        Tem certeza que deseja cancelar {count} atividade{count > 1 ? "s" : ""}? O status mudará para{" "}
        <b>Cancelado</b>.
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onHide}>
          Voltar
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          Confirmar cancelamento
        </button>
      </div>
    </Modal>
  );
}
