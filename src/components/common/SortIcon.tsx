// Ícone de ordenação (coluna clicável) — SVG em vez do caractere "↕", que não é
// coberto pelos subconjuntos de fonte auto-hospedados.
export default function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}
