import { downloadBlob } from "./downloadBlob";

interface DownloadableAttachment {
  fileName: string;
  url?: string;
  file?: File;
}

export async function downloadEvidenceAttachment(attachment: DownloadableAttachment): Promise<void> {
  if (attachment.file) {
    downloadBlob(attachment.file, attachment.fileName);
    return;
  }

  if (!attachment.url) return;

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error("Evidence download failed");
    const blob = await response.blob();
    downloadBlob(blob, attachment.fileName);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = attachment.url;
    anchor.download = attachment.fileName;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
