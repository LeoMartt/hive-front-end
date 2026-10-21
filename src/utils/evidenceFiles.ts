import { toLocalIsoString } from "./activityIndicators";

const FORBIDDEN_EXTENSIONS = /\.(aac|avi|flac|m4a|m4v|mkv|mov|mp3|mp4|mpeg|mpg|ogg|wav|webm|wma|wmv)$/i;

export function formatEvidenceFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export function getEvidenceFileError(file: File, maxSizeMb: number): string | null {
  if (file.type.startsWith("audio/") || file.type.startsWith("video/") || FORBIDDEN_EXTENSIONS.test(file.name)) {
    return "Evidências em áudio ou vídeo não são permitidas.";
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `O arquivo excede o limite de ${maxSizeMb} MB configurado no projeto.`;
  }
  return null;
}

export function buildEvidenceMetadata(file: File, uploadedBy: string) {
  return {
    fileName: file.name,
    sizeLabel: formatEvidenceFileSize(file.size),
    uploadedBy,
    uploadedAt: toLocalIsoString(new Date()),
    contentType: file.type || undefined,
    file,
  };
}
