// Conector visual "└" entre um processo e o módulo pai — desenhado em SVG (não como
// caractere Unicode) porque os subconjuntos de fonte auto-hospedados (Inter/JetBrains
// Mono via @fontsource) não cobrem o bloco Box Drawing, o que forçava um fallback de
// fonte do sistema com métricas bem diferentes das do resto do texto.
export default function TreeConnectorIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M3 0v6.5h6" />
    </svg>
  );
}
