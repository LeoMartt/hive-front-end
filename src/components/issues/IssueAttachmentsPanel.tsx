import type { Issue, IssueAttachment } from "../../types/issue";

function attachIconLabel(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() ?? "";
}

function isImage(fileName: string): boolean {
  return /\.(png|jpe?g|gif)$/i.test(fileName);
}

function AttachmentRow({ attachment, sentBy }: { attachment: IssueAttachment; sentBy: string }) {
  return (
    <div className="attach-row">
      <div className={isImage(attachment.fileName) ? "attach-icon img" : "attach-icon"}>
        {attachIconLabel(attachment.fileName)}
      </div>
      <div className="attach-body">
        <b>{attachment.fileName}</b>
        <span>
          {attachment.sizeLabel} · enviado por {sentBy}
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

interface IssueAttachmentsPanelProps {
  issue: Issue;
}

export default function IssueAttachmentsPanel({ issue }: IssueAttachmentsPanelProps) {
  return (
    <>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head">
          <div className="panel-title">
            Anexo da issue <span>enviado na abertura</span>
          </div>
        </div>
        {issue.openingAttachment ? (
          <AttachmentRow attachment={issue.openingAttachment} sentBy={`${issue.tester} (Tester)`} />
        ) : (
          <div className="linked-issues-empty">Nenhum anexo — opcional para issues não impeditivas.</div>
        )}
      </div>

      {issue.solutionAttachment ? (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Anexo da solução <span>enviado pelo Dev</span>
            </div>
          </div>
          <AttachmentRow attachment={issue.solutionAttachment} sentBy={`${issue.dev} (Dev)`} />
        </div>
      ) : (
        <div className="linked-issues-empty">
          Anexo da solução ainda não existe — aguardando o Dev propor uma solução.
        </div>
      )}
    </>
  );
}
