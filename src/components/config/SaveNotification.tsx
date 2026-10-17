import { useEffect, useState } from "react";
import { CircleCheck, X } from "lucide-react";

export default function SaveNotification() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="save-notification" role="status" aria-live="polite">
      <CircleCheck size={18} aria-hidden="true" />
      <span>Edições Salvas</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fechar notificação" title="Fechar notificação">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
