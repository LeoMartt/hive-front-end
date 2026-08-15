import { useEffect, type ReactNode } from "react";
import CloseIcon from "./CloseIcon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  labelledBy?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, wide = false, labelledBy, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={wide ? "modal-box wide" : "modal-box"} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}
