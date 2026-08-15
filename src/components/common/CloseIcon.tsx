// SVG em vez do caractere "✕" (bloco Dingbats), não coberto pelos subconjuntos
// de fonte auto-hospedados.
export default function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
