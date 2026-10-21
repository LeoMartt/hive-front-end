import { useState } from "react";
import { createPortal } from "react-dom";
import { CircleCheck, X } from "lucide-react";

export default function SaveNotification() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return createPortal(
    <div className="save-notification" role="status" aria-live="polite">
      <CircleCheck size={18} aria-hidden="true" />
      <span>Edições Salvas</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fechar notificação" title="Fechar notificação">
        <X size={16} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
