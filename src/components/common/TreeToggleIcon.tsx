interface TreeToggleIconProps {
  /** Aponta para baixo quando expandido, para a direita quando recolhido. */
  expanded: boolean;
}

export default function TreeToggleIcon({ expanded }: TreeToggleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      style={{ transform: expanded ? undefined : "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
