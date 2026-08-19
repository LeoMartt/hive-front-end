import type { Activity, ActivityAttachment } from "../../types/activity";

function attachIconLabel(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() ?? "";
}

function isImage(fileName: string): boolean {
  return /\.(png|jpe?g|gif)$/i.test(fileName);
}

function AttachmentRow({ attachment }: { attachment: ActivityAttachment }) {
  return (
    <div className="attach-row">
      <div className={isImage(attachment.fileName) ? "attach-icon img" : "attach-icon"}>
        {attachIconLabel(attachment.fileName)}
      </div>
      <div className="attach-body">
        <b>{attachment.fileName}</b>
        <span>
          {attachment.sizeLabel} · enviado por {attachment.uploadedBy}
        </span>
      </div>
      <button type="button" className="attach-dl" title="Baixar anexo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3v12m0 0-4-4m4 4 4-4" />
          <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </button>
    </div>
  );
}

interface ActivityAttachmentsPanelProps {
  activity: Activity;
  predecessor: Activity | null;
}

// Anexos herdados só fazem sentido para uma atividade bloqueada, ligando o problema
// atual a uma evidência já enviada na atividade predecessora.
export default function ActivityAttachmentsPanel({ activity, predecessor }: ActivityAttachmentsPanelProps) {
  const inheritedAttachments = activity.status === "bloqueado" && predecessor ? predecessor.attachments : [];

  if (activity.attachments.length === 0 && inheritedAttachments.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Anexos</div>
      </div>
      {activity.attachments.map((attachment) => (
        <AttachmentRow key={attachment.fileName} attachment={attachment} />
      ))}
      {inheritedAttachments.length > 0 && predecessor && (
        <>
          <div className="attach-divider">Herdado de {predecessor.id} (predecessora)</div>
          {inheritedAttachments.map((attachment) => (
            <AttachmentRow key={attachment.fileName} attachment={attachment} />
          ))}
        </>
      )}
    </div>
  );
}
